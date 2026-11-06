const { test } = require('node:test');
const assert = require('node:assert/strict');
const ImageAnalysisService = require('../src/services/ai/ImageAnalysisService');

const criarLogs = () => {
  const registros = new Map();
  let contador = 0;

  return {
    registros,
    async create(data) {
      const log = { id: `log-${++contador}`, consumido_em: null, expirado: false, ...data };
      registros.set(log.id, log);
      return log;
    },
    async findByPk(id) {
      return registros.get(id) || null;
    },
    async consumir(id) {
      const log = registros.get(id);
      if (log.consumido_em || log.expirado) return false;
      log.consumido_em = new Date();
      return true;
    },
  };
};

const criarServico = (analisar, { configurado = true } = {}) => {
  const logs = criarLogs();
  const client = { modelo: 'modelo-teste', estaConfigurado: () => configurado, analisar };
  const preparer = { preparar: async () => ({ buffer: Buffer.from('preparada'), mimeType: 'image/jpeg' }) };
  return { service: new ImageAnalysisService({ client, preparer, logs }), logs };
};

const aprovar = async () => ({
  bloqueioSeguranca: false,
  motivoSeguranca: null,
  dados: { veredito: 'valida', motivo: 'ok', categoria: 'buraco', titulo: 'Buraco', descricao: 'd', prioridade: 'alta', orgao: 'PREFEITURA' },
});

const file = { buffer: Buffer.from('foto original') };

const statusDoErro = (statusCode) => (err) => {
  assert.equal(err.statusCode, statusCode);
  return true;
};

test('aprovada devolve analise_id e grava auditoria com hash, sem a imagem', async () => {
  const { service, logs } = criarServico(aprovar);
  const r = await service.analisar(file, 'user-1');

  assert.equal(r.resultado, 'aprovada');
  assert.ok(r.analise_id);
  assert.equal(r.sugestoes.categoria, 'buraco');

  const log = logs.registros.get(r.analise_id);
  assert.equal(log.user_id, 'user-1');
  assert.equal(log.modelo, 'modelo-teste');
  assert.match(log.imagem_sha256, /^[0-9a-f]{64}$/);
  assert.equal(typeof log.tempo_ms, 'number');
  assert.equal(JSON.stringify(log).includes(file.buffer.toString('base64')), false);
});

test('bloqueada não devolve analise_id, mas fica na auditoria', async () => {
  const { service, logs } = criarServico(async () => ({
    bloqueioSeguranca: false,
    motivoSeguranca: null,
    dados: { veredito: 'impropria', motivo: 'conteúdo ofensivo' },
  }));
  const r = await service.analisar(file, 'user-1');

  assert.equal(r.resultado, 'bloqueada_impropria');
  assert.equal(r.analise_id, null);
  assert.equal(logs.registros.size, 1);
});

test('falha do Gemini vira indisponível e registra o erro', async () => {
  const { service, logs } = criarServico(async () => { throw new Error('timeout'); });
  const r = await service.analisar(file, 'user-1');

  assert.equal(r.resultado, 'indisponivel');
  assert.ok(r.analise_id);
  assert.equal(r.sugestoes, null);
  assert.equal(logs.registros.get(r.analise_id).erro, 'timeout');
});

test('resposta inválida da IA vira indisponível', async () => {
  const { service } = criarServico(async () => ({ bloqueioSeguranca: false, dados: { veredito: 'talvez' } }));
  const r = await service.analisar(file, 'user-1');
  assert.equal(r.resultado, 'indisponivel');
});

test('sem chave não chama a IA', async () => {
  let chamou = false;
  const { service, logs } = criarServico(async () => { chamou = true; }, { configurado: false });
  const r = await service.analisar(file, 'user-1');

  assert.equal(chamou, false);
  assert.equal(r.resultado, 'indisponivel');
  assert.match(logs.registros.get(r.analise_id).erro, /GEMINI_API_KEY/);
});

test('imagem ilegível devolve 422 e não chega à IA', async () => {
  let chamou = false;
  const { service } = criarServico(async () => { chamou = true; });
  service.preparer = { preparar: async () => { throw new Error('corrompida'); } };

  await assert.rejects(service.analisar(file, 'user-1'), statusDoErro(422));
  assert.equal(chamou, false);
});

test('validarParaEnvio aceita a mesma foto do mesmo usuário', async () => {
  const { service } = criarServico(aprovar);
  const { analise_id } = await service.analisar(file, 'user-1');
  const log = await service.validarParaEnvio(analise_id, file, 'user-1');
  assert.equal(log.id, analise_id);
});

test('validarParaEnvio aceita análise indisponível', async () => {
  const { service } = criarServico(async () => { throw new Error('fora do ar'); });
  const { analise_id } = await service.analisar(file, 'user-1');
  await service.validarParaEnvio(analise_id, file, 'user-1');
});

test('validarParaEnvio recusa envio sem análise', async () => {
  const { service } = criarServico(aprovar);
  await assert.rejects(service.validarParaEnvio(undefined, file, 'user-1'), statusDoErro(422));
  await assert.rejects(service.validarParaEnvio('inexistente', file, 'user-1'), statusDoErro(422));
});

test('validarParaEnvio recusa análise de outro usuário', async () => {
  const { service } = criarServico(aprovar);
  const { analise_id } = await service.analisar(file, 'user-1');
  await assert.rejects(service.validarParaEnvio(analise_id, file, 'user-2'), statusDoErro(422));
});

test('validarParaEnvio recusa foto trocada depois da análise', async () => {
  const { service } = criarServico(aprovar);
  const { analise_id } = await service.analisar(file, 'user-1');
  await assert.rejects(
    service.validarParaEnvio(analise_id, { buffer: Buffer.from('outra foto') }, 'user-1'),
    statusDoErro(422)
  );
});

test('validarParaEnvio recusa análise bloqueada mesmo com o id em mãos', async () => {
  const { service, logs } = criarServico(async () => ({
    bloqueioSeguranca: false,
    dados: { veredito: 'fora_do_escopo', motivo: 'selfie' },
  }));
  await service.analisar(file, 'user-1');
  const [id] = logs.registros.keys();
  await assert.rejects(service.validarParaEnvio(id, file, 'user-1'), statusDoErro(422));
});

test('validarParaEnvio recusa reuso e análise expirada', async () => {
  const { service, logs } = criarServico(aprovar);
  const { analise_id } = await service.analisar(file, 'user-1');
  await service.validarParaEnvio(analise_id, file, 'user-1');
  await assert.rejects(service.validarParaEnvio(analise_id, file, 'user-1'), statusDoErro(422));

  const outra = await service.analisar(file, 'user-1');
  logs.registros.get(outra.analise_id).expirado = true;
  await assert.rejects(service.validarParaEnvio(outra.analise_id, file, 'user-1'), statusDoErro(422));
});
