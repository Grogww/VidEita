const fs = require('fs/promises');
const path = require('path');
const { createHash } = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const GeminiClient = require('../../src/services/ai/GeminiClient');
const ImagePreparer = require('../../src/services/ai/ImagePreparer');
const { mapear } = require('../../src/services/ai/AnalysisResultMapper');
const { SYSTEM_PROMPT, USER_PROMPT, RESPONSE_SCHEMA, CONFIG_GERACAO } = require('../../src/services/ai/analysisPrompt');
const { gerarRelatorio } = require('./relatorio');

const RAIZ = __dirname;
const sha256 = (dados) => createHash('sha256').update(dados).digest('hex');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const lerJson = async (arquivo) => JSON.parse(await fs.readFile(arquivo, 'utf8'));

// Qualquer mudança no prompt, no schema, na configuração ou no modelo gera uma versão nova e reabre as análises.
const versaoDoPrompt = (modelo) =>
  sha256([SYSTEM_PROMPT, USER_PROMPT, JSON.stringify(RESPONSE_SCHEMA), JSON.stringify(CONFIG_GERACAO), modelo].join('\n')).slice(0, 12);

class CotaEsgotada extends Error {}

const ehCota = (err) => err.status === 429 || /RESOURCE_EXHAUSTED/.test(err.message);
const ehCotaDiaria = (err) => /PerDay/i.test(err.message);

async function gravarAtomico(arquivo, dados) {
  const temporario = `${arquivo}.tmp`;
  await fs.writeFile(temporario, `${JSON.stringify(dados, null, 2)}\n`);
  await fs.rename(temporario, arquivo);
}

async function analisarCaso({ client, preparer, caso, buffer, esperaCotaMs, log }) {
  const imagem = await preparer.preparar({ buffer, mimetype: 'image/jpeg', originalname: `${caso.id}.jpg` });

  for (let tentativa = 1; ; tentativa++) {
    const inicio = Date.now();
    try {
      const resposta = await client.analisar(imagem.buffer, imagem.mimeType);
      const tempo_ms = Date.now() - inicio;
      try {
        const analise = mapear(resposta);
        return { situacao: 'ok', resultado: analise.resultado, motivo: analise.motivo, sugestoes: analise.sugestoes, resposta, tempo_ms };
      } catch (err) {
        return { situacao: 'formato_invalido', resposta, erro: err.message, tempo_ms };
      }
    } catch (err) {
      if (!ehCota(err)) return { situacao: 'erro_tecnico', erro: err.message, tempo_ms: Date.now() - inicio };
      // Cota por minuto se recupera sozinha; a diária só trocando a chave.
      if (ehCotaDiaria(err) || tentativa >= 3) throw new CotaEsgotada(err.message);
      log(`  limite por minuto atingido, aguardando ${esperaCotaMs / 1000}s...`);
      await esperar(esperaCotaMs);
    }
  }
}

async function avaliar({
  client,
  preparer = new ImagePreparer(),
  manifesto,
  dirImagens,
  dirResultados,
  pausaMs = 0,
  esperaCotaMs = 60000,
  refazerErros = false,
  somenteRelatorio = false,
  log = console.log,
}) {
  const versao = versaoDoPrompt(client.modelo);
  const pasta = path.join(dirResultados, versao);
  await fs.mkdir(pasta, { recursive: true });

  const casos = [...manifesto.imagens, ...manifesto.derivadas];
  const resultados = {};
  let cotaEsgotada = null;
  let chamadas = 0;

  for (const caso of casos) {
    const buffer = await fs.readFile(path.join(dirImagens, `${caso.id}.jpg`));
    const imagem_sha256 = sha256(buffer);
    const arquivo = path.join(pasta, `${caso.id}.json`);
    const anterior = await lerJson(arquivo).catch(() => null);

    const jaAnalisado = anterior?.imagem_sha256 === imagem_sha256
      && !(refazerErros && anterior.situacao === 'erro_tecnico');
    if (jaAnalisado || somenteRelatorio || cotaEsgotada) {
      if (anterior?.imagem_sha256 === imagem_sha256) resultados[caso.id] = anterior;
      continue;
    }

    if (chamadas++ > 0) await esperar(pausaMs);
    log(`analisando ${caso.id}...`);
    try {
      const registro = await analisarCaso({ client, preparer, caso, buffer, esperaCotaMs, log });
      resultados[caso.id] = { id: caso.id, versao, modelo: client.modelo, imagem_sha256, analisado_em: new Date().toISOString(), ...registro };
      await gravarAtomico(arquivo, resultados[caso.id]);
    } catch (err) {
      if (!(err instanceof CotaEsgotada)) throw err;
      cotaEsgotada = err.message;
    }
  }

  const relatorio = gerarRelatorio({ casos, resultados, versao, modelo: client.modelo });
  await fs.writeFile(path.join(pasta, 'relatorio.md'), relatorio);

  return {
    versao,
    pendentes: casos.filter((c) => !resultados[c.id] || (refazerErros && resultados[c.id].situacao === 'erro_tecnico')).length,
    cotaEsgotada,
    relatorio,
    arquivoRelatorio: path.join(pasta, 'relatorio.md'),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const client = new GeminiClient();
  const somenteRelatorio = args.includes('--relatorio');

  if (!somenteRelatorio && !client.estaConfigurado()) {
    console.error('Defina GEMINI_API_KEY no ambiente ou em backend/.env');
    process.exit(1);
  }
  if (!somenteRelatorio) console.log(`Modelo ${client.modelo} · chave terminada em ...${client.apiKey.slice(-4)}`);

  const r = await avaliar({
    client,
    manifesto: await lerJson(path.join(RAIZ, 'manifesto.json')),
    dirImagens: path.join(RAIZ, 'dados', 'imagens'),
    dirResultados: path.join(RAIZ, 'dados', 'resultados'),
    pausaMs: Number(process.env.AVALIACAO_PAUSA_MS || 13000),
    refazerErros: args.includes('--refazer-erros'),
    somenteRelatorio,
  });

  console.log(`\n${r.relatorio}\nRelatório salvo em ${path.relative(process.cwd(), r.arquivoRelatorio)}`);
  if (r.cotaEsgotada) {
    const limite = r.cotaEsgotada.match(/"quotaValue":\s*"(\d+)"/)?.[1];
    console.error(`\nCota esgotada${limite ? ` (limite da chave: ${limite})` : ''}. Faltam ${r.pendentes} imagens: troque a chave e rode de novo.`);
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { avaliar, versaoDoPrompt };
