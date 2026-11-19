const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapear, extrairAreas, areasDoLog, MENSAGENS } = require('../src/services/ai/AnalysisResultMapper');

const resposta = (dados) => ({ bloqueioSeguranca: false, motivoSeguranca: null, dados });

test('imagem válida vira sugestões', () => {
  const r = mapear(resposta({
    veredito: 'valida',
    motivo: 'Buraco visível',
    categoria: 'buraco',
    titulo: '  Buraco na pista  ',
    descricao: 'Buraco no asfalto',
    prioridade: 'alta',
    orgao: 'PREFEITURA',
  }));

  assert.equal(r.resultado, 'aprovada');
  assert.deepEqual(r.sugestoes, {
    categoria: 'buraco',
    titulo: 'Buraco na pista',
    descricao: 'Buraco no asfalto',
    prioridade: 'alta',
    orgao: 'PREFEITURA',
  });
});

test('valores fora das listas caem no padrão seguro', () => {
  const r = mapear(resposta({
    veredito: 'valida',
    motivo: 'ok',
    categoria: 'DROP TABLE',
    prioridade: 'maxima',
    orgao: 'constructor',
  }));

  assert.equal(r.sugestoes.categoria, 'outro');
  assert.equal(r.sugestoes.prioridade, 'media');
  assert.equal(r.sugestoes.orgao, 'PREFEITURA');
  assert.equal(r.sugestoes.titulo, '');
});

test('título e descrição respeitam os limites do formulário', () => {
  const r = mapear(resposta({ veredito: 'valida', motivo: 'ok', titulo: 'a'.repeat(300), descricao: 'b'.repeat(3000) }));
  assert.equal(r.sugestoes.titulo.length, 150);
  assert.equal(r.sugestoes.descricao.length, 1000);
});

test('bloqueios não trazem sugestões e usam mensagem fixa', () => {
  const impropria = mapear(resposta({ veredito: 'impropria', motivo: 'texto do modelo', titulo: 'x' }));
  assert.equal(impropria.resultado, 'bloqueada_impropria');
  assert.equal(impropria.sugestoes, null);
  assert.equal(impropria.motivo, 'texto do modelo');
  assert.doesNotMatch(impropria.mensagem, /texto do modelo/);

  const fora = mapear(resposta({ veredito: 'fora_do_escopo', motivo: 'selfie' }));
  assert.equal(fora.resultado, 'bloqueada_fora_escopo');
  assert.equal(fora.sugestoes, null);
});

test('recusa de segurança do modelo conta como imprópria', () => {
  const r = mapear({ bloqueioSeguranca: true, motivoSeguranca: 'IMAGE_SAFETY', dados: null });
  assert.equal(r.resultado, 'bloqueada_impropria');
  assert.match(r.motivo, /IMAGE_SAFETY/);
});

test('resposta fora do formato gera erro', () => {
  assert.throws(() => mapear(resposta(null)));
  assert.throws(() => mapear(resposta({ veredito: 'talvez' })));
});

test('áreas sensíveis inválidas são descartadas', () => {
  const areas = extrairAreas([
    { tipo: 'rosto', box_2d: [120, 300, 260, 380] },
    { tipo: 'placa', box_2d: [610, 700, 660] },
    { tipo: 'placa', box_2d: [610, 700, 660, 1200] },
    { tipo: 'documento', box_2d: [500, 500, 400, 600] },
    { tipo: 'rosto', box_2d: ['1', 2, 3, 4] },
    null,
  ]);
  assert.deepEqual(areas, [[120, 300, 260, 380]]);
  assert.deepEqual(extrairAreas(undefined), []);
});

test('mensagem avisa quando a foto será censurada', () => {
  const base = { veredito: 'valida', motivo: 'ok' };
  assert.equal(mapear(resposta({ ...base, areas_sensiveis: [] })).mensagem, MENSAGENS.aprovada);
  assert.equal(
    mapear(resposta({ ...base, areas_sensiveis: [{ tipo: 'rosto', box_2d: [1, 2, 3, 4] }] })).mensagem,
    MENSAGENS.aprovada_com_censura
  );
});

test('áreas são lidas do log salvo, como objeto ou texto JSON', () => {
  const resposta_json = { dados: { areas_sensiveis: [{ tipo: 'placa', box_2d: [10, 20, 30, 40] }] } };
  assert.deepEqual(areasDoLog({ resposta_json }), [[10, 20, 30, 40]]);
  assert.deepEqual(areasDoLog({ resposta_json: JSON.stringify(resposta_json) }), [[10, 20, 30, 40]]);
  assert.deepEqual(areasDoLog({ resposta_json: null }), []);
});
