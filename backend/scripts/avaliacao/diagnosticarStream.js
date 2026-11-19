const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const GeminiClient = require('../../src/services/ai/GeminiClient');
const ImagePreparer = require('../../src/services/ai/ImagePreparer');

const RAIZ = __dirname;
const TIMEOUT_MS = 120000;
const PAUSA_MS = 13000;

// Mostra em que fase a chamada demora: fila (nada chega), raciocínio, geração ou bloqueio.
async function diagnosticar(client, id, configOriginal) {
  const buffer = await fs.readFile(path.join(RAIZ, 'dados', 'imagens', `${id}.jpg`));
  const imagem = await new ImagePreparer().preparar({ buffer, mimetype: 'image/jpeg', originalname: `${id}.jpg` });

  const requisicao = client.montarRequisicao(imagem.buffer, imagem.mimeType, TIMEOUT_MS);
  if (configOriginal) {
    delete requisicao.config.thinkingConfig;
    delete requisicao.config.mediaResolution;
  }
  requisicao.config.thinkingConfig = { ...requisicao.config.thinkingConfig, includeThoughts: true };

  const inicio = Date.now();
  const eventos = [];
  const registrar = (tipo, dados = {}) => {
    const evento = { s: Number(((Date.now() - inicio) / 1000).toFixed(1)), tipo, ...dados };
    eventos.push(evento);
    console.log(`  ${String(evento.s).padStart(6)}s ${tipo} ${Object.keys(dados).length ? JSON.stringify(dados).slice(0, 160) : ''}`);
  };

  console.log(`\n${id}${configOriginal ? ' (configuração original)' : ''}`);
  let texto = '';
  let uso = null;
  try {
    const stream = await client.obterSdk().models.generateContentStream(requisicao);
    for await (const parte of stream) {
      if (parte.promptFeedback?.blockReason) registrar('bloqueio', { motivo: parte.promptFeedback.blockReason });
      const candidato = parte.candidates?.[0];
      for (const p of candidato?.content?.parts || []) {
        if (p.thought) registrar('pensamento', { resumo: p.text });
        else if (p.text) {
          texto += p.text;
          registrar('texto', { caracteres: texto.length });
        }
      }
      if (candidato?.finishReason) registrar('fim', { motivo: candidato.finishReason });
      uso = parte.usageMetadata || uso;
    }
  } catch (err) {
    registrar('erro', { status: err.status, mensagem: err.message.slice(0, 300) });
  }

  registrar('total', { tokensPensamento: uso?.thoughtsTokenCount, tokensSaida: uso?.candidatesTokenCount });
  const destino = path.join(RAIZ, 'dados', 'diagnosticos', `${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, `${JSON.stringify({ id, configOriginal, modelo: client.modelo, eventos, texto, uso }, null, 2)}\n`);

  return eventos.some((e) => e.tipo === 'erro' && e.status === 429);
}

async function main() {
  const args = process.argv.slice(2);
  const configOriginal = args.includes('--config-original');
  const ids = args.filter((a) => !a.startsWith('--'));
  const client = new GeminiClient();

  if (!ids.length || !client.estaConfigurado()) {
    console.error('Uso: node scripts/avaliacao/diagnosticarStream.js <id> [<id>...] [--config-original]  (requer GEMINI_API_KEY)');
    process.exit(1);
  }

  for (const [i, id] of ids.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS));
    if (await diagnosticar(client, id, configOriginal)) {
      console.error('\nCota esgotada.');
      process.exitCode = 2;
      return;
    }
  }
}

main();
