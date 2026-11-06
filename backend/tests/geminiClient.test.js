const { test } = require('node:test');
const assert = require('node:assert/strict');
const GeminiClient = require('../src/services/ai/GeminiClient');

const clienteCom = (resposta) => {
  const chamadas = [];
  const sdk = {
    models: {
      generateContent: async (params) => {
        chamadas.push(params);
        return resposta;
      },
    },
  };
  return { client: new GeminiClient({ apiKey: 'teste', modelo: 'modelo-teste', sdk }), chamadas };
};

test('envia a imagem em base64 e exige resposta no schema', async () => {
  const { client, chamadas } = clienteCom({ text: '{"veredito":"valida","motivo":"ok"}' });
  const r = await client.analisar(Buffer.from('imagem'), 'image/jpeg');

  assert.deepEqual(r.dados, { veredito: 'valida', motivo: 'ok' });
  assert.equal(chamadas[0].model, 'modelo-teste');
  assert.equal(chamadas[0].contents[0].inlineData.data, Buffer.from('imagem').toString('base64'));
  assert.equal(chamadas[0].config.responseMimeType, 'application/json');
  assert.ok(chamadas[0].config.responseJsonSchema);
  assert.ok(chamadas[0].config.abortSignal instanceof AbortSignal);
});

test('detecta bloqueio no prompt', async () => {
  const { client } = clienteCom({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } });
  const r = await client.analisar(Buffer.from('x'), 'image/jpeg');
  assert.equal(r.bloqueioSeguranca, true);
  assert.equal(r.motivoSeguranca, 'PROHIBITED_CONTENT');
});

test('detecta bloqueio no fim da geração', async () => {
  const { client } = clienteCom({ candidates: [{ finishReason: 'IMAGE_SAFETY' }] });
  const r = await client.analisar(Buffer.from('x'), 'image/jpeg');
  assert.equal(r.bloqueioSeguranca, true);
});

test('JSON inválido gera erro', async () => {
  const { client } = clienteCom({ text: 'não é json' });
  await assert.rejects(client.analisar(Buffer.from('x'), 'image/jpeg'));
});

// Usa o SDK real, simulando só a rede.
const comRespostasHttp = async (respostas, executar) => {
  const original = globalThis.fetch;
  let chamadas = 0;
  globalThis.fetch = async () => {
    const { status, corpo } = respostas[Math.min(chamadas++, respostas.length - 1)];
    return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await executar();
    return chamadas;
  } finally {
    globalThis.fetch = original;
  }
};

const sobrecarga = { status: 503, corpo: { error: { code: 503, message: 'high demand', status: 'UNAVAILABLE' } } };
const sucesso = {
  status: 200,
  corpo: { candidates: [{ content: { parts: [{ text: '{"veredito":"valida","motivo":"ok"}' }] } }] },
};

test('503 temporário é repetido até obter resposta', async () => {
  const client = new GeminiClient({ apiKey: 'teste', modelo: 'modelo-teste' });
  let resultado;

  const chamadas = await comRespostasHttp([sobrecarga, sucesso], async () => {
    resultado = await client.analisar(Buffer.from('x'), 'image/jpeg');
  });

  assert.equal(chamadas, 2);
  assert.equal(resultado.dados.veredito, 'valida');
});

test('503 persistente desiste depois de três tentativas', async () => {
  const client = new GeminiClient({ apiKey: 'teste', modelo: 'modelo-teste' });

  const chamadas = await comRespostasHttp([sobrecarga], async () => {
    await assert.rejects(client.analisar(Buffer.from('x'), 'image/jpeg'), /high demand/);
  });

  assert.equal(chamadas, 3);
});

test('cota esgotada (429) não é repetida', async () => {
  const client = new GeminiClient({ apiKey: 'teste', modelo: 'modelo-teste' });
  const cota = { status: 429, corpo: { error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } } };

  const chamadas = await comRespostasHttp([cota], async () => {
    await assert.rejects(client.analisar(Buffer.from('x'), 'image/jpeg'), /quota/);
  });

  assert.equal(chamadas, 1);
});

test('sem chave o cliente não fica configurado', () => {
  assert.equal(new GeminiClient({ apiKey: '' }).estaConfigurado(), false);
});
