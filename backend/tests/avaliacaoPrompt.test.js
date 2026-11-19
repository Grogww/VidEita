const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { avaliar } = require('../scripts/avaliacao/avaliarPrompt');

const valida = { veredito: 'valida', categoria: ['buraco'], orgao: 'PREFEITURA' };
const fora = { veredito: 'fora_do_escopo' };
const manifesto = {
  imagens: [
    { id: 'buraco-01', gabarito: valida },
    { id: 'buraco-02', gabarito: valida },
  ],
  derivadas: [{ id: 'fora-01', gabarito: fora }],
};

const respostaValida = {
  bloqueioSeguranca: false,
  dados: { veredito: 'valida', motivo: 'buraco na via', categoria: 'buraco', titulo: 't', descricao: 'd', prioridade: 'alta', orgao: 'PREFEITURA' },
};
const respostaFora = { bloqueioSeguranca: false, dados: { veredito: 'fora_do_escopo', motivo: 'gato' } };

const erroCota = (quota) => Object.assign(new Error(`{"error":{"status":"RESOURCE_EXHAUSTED","details":[{"quotaId":"${quota}","quotaValue":"20"}]}}`), { status: 429 });

// Cada item da fila é a resposta de uma chamada; Error é lançado.
const clienteCom = (fila) => {
  const client = {
    modelo: 'modelo-teste',
    chamadas: 0,
    async analisar() {
      client.chamadas++;
      const proxima = fila.shift();
      if (proxima instanceof Error) throw proxima;
      return proxima;
    },
  };
  return client;
};

let dir;
const executar = (client, opcoes = {}) =>
  avaliar({
    client,
    preparer: { preparar: async (f) => ({ buffer: f.buffer, mimeType: 'image/jpeg' }) },
    manifesto,
    dirImagens: path.join(dir, 'imagens'),
    dirResultados: path.join(dir, 'resultados'),
    esperaCotaMs: 0,
    log: () => {},
    ...opcoes,
  });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videita-avaliacao-'));
  fs.mkdirSync(path.join(dir, 'imagens'));
  for (const id of ['buraco-01', 'buraco-02', 'fora-01']) fs.writeFileSync(path.join(dir, 'imagens', `${id}.jpg`), id);
});

test('analisa cada imagem uma vez e não repete na execução seguinte', async () => {
  const primeiro = clienteCom([respostaValida, respostaValida, respostaFora]);
  const r = await executar(primeiro);
  assert.equal(primeiro.chamadas, 3);
  assert.equal(r.pendentes, 0);
  assert.match(r.relatorio, /Acerto do veredito \| 3\/3/);

  const segundo = clienteCom([]);
  const r2 = await executar(segundo);
  assert.equal(segundo.chamadas, 0);
  assert.equal(r2.pendentes, 0);
});

test('cota diária esgotada interrompe e a próxima chave continua só os pendentes', async () => {
  const r = await executar(clienteCom([respostaValida, erroCota('GenerateRequestsPerDayPerProjectPerModel-FreeTier')]));
  assert.equal(r.pendentes, 2);
  assert.match(r.cotaEsgotada, /quotaValue/);

  const outraChave = clienteCom([respostaValida, respostaFora]);
  const r2 = await executar(outraChave);
  assert.equal(outraChave.chamadas, 2);
  assert.equal(r2.pendentes, 0);
});

test('limite por minuto aguarda e tenta de novo a mesma imagem', async () => {
  const client = clienteCom([erroCota('GenerateRequestsPerMinutePerProjectPerModel-FreeTier'), respostaValida, respostaValida, respostaFora]);
  const r = await executar(client);
  assert.equal(client.chamadas, 4);
  assert.equal(r.pendentes, 0);
  assert.equal(r.cotaEsgotada, null);
});

test('erro técnico fica registrado e só é refeito quando pedido', async () => {
  await executar(clienteCom([new Error('timeout'), respostaValida, respostaFora]));

  const semRefazer = clienteCom([]);
  const r = await executar(semRefazer);
  assert.equal(semRefazer.chamadas, 0);
  assert.match(r.relatorio, /Erro técnico \(timeout, rede, servidor\) \| 1/);

  const refazendo = clienteCom([respostaValida]);
  await executar(refazendo, { refazerErros: true });
  assert.equal(refazendo.chamadas, 1);
});

test('ao refazer erros, os que a cota impediu continuam pendentes', async () => {
  await executar(clienteCom([new Error('timeout'), new Error('timeout'), respostaFora]));

  const r = await executar(clienteCom([erroCota('GenerateRequestsPerDayPerProjectPerModel-FreeTier')]), { refazerErros: true });
  assert.equal(r.pendentes, 2);
});

test('resposta fora do formato conta como falha do prompt', async () => {
  const r = await executar(clienteCom([{ bloqueioSeguranca: false, dados: { veredito: 'talvez' } }, respostaValida, respostaFora]));
  assert.match(r.relatorio, /Resposta fora do formato \| 1/);
  assert.match(r.relatorio, /buraco-01 \| valida · buraco · PREFEITURA \| formato_invalido/);
});

test('imagem alterada é analisada de novo', async () => {
  await executar(clienteCom([respostaValida, respostaValida, respostaFora]));
  fs.writeFileSync(path.join(dir, 'imagens', 'buraco-01.jpg'), 'outra foto');

  const client = clienteCom([respostaValida]);
  await executar(client);
  assert.equal(client.chamadas, 1);
});
