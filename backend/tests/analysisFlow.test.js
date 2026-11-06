// Fluxo HTTP real (rotas, multer, validação, sharp e gravação em disco).
// Só o banco e a chamada ao Gemini são simulados.
const { test, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'videita-teste-'));
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = uploadDir;
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const app = require('../app');
const User = require('../src/models/User');
const Report = require('../src/models/Report');
const Orgao = require('../src/models/Orgao');
const AiAnalysisLog = require('../src/models/AiAnalysisLog');
const { imageAnalysisService } = require('../src/controllers/AnalysisController');

const logs = new Map();
const reportsCriados = [];
let respostaIa;
let imagemEnviadaAoGemini;
let server;
let baseUrl;
let foto;

const tokenDe = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const arquivosSalvos = () => fs.readdirSync(uploadDir);

const enviar = async (rota, { campos = {}, arquivo, nome = 'foto.jpg', tipo = 'image/jpeg', usuario = 'user-1' }) => {
  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => form.append(k, v));
  if (arquivo) form.append('imagem', new Blob([arquivo], { type: tipo }), nome);

  const res = await fetch(`${baseUrl}${rota}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenDe(usuario)}` },
    body: form,
  });
  return { status: res.status, corpo: await res.json() };
};

const camposReport = {
  titulo: 'Buraco na pista',
  categoria: 'buraco',
  latitude: '-27.0085',
  longitude: '-51.1517',
};

before(async () => {
  foto = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#777777' } })
    .withExif({ IFD0: { Copyright: 'dado-privado' } })
    .jpeg()
    .toBuffer();

  mock.method(User, 'findByPk', async (id) => ({ id, role: 'user' }));
  mock.method(Orgao, 'findBySigla', async (sigla) => ({ id: 7, sigla }));
  mock.method(Report, 'create', async (data) => {
    const report = { id: 'report-1', ...data };
    reportsCriados.push(report);
    return report;
  });
  mock.method(Report, 'findByPk', async () => ({ ...reportsCriados.at(-1) }));

  mock.method(AiAnalysisLog, 'create', async (data) => {
    const log = { id: `log-${logs.size + 1}`, consumido_em: null, ...data };
    logs.set(log.id, log);
    return log;
  });
  mock.method(AiAnalysisLog, 'findByPk', async (id) => logs.get(id) || null);
  mock.method(AiAnalysisLog, 'consumir', async (id) => {
    const log = logs.get(id);
    if (log.consumido_em) return false;
    log.consumido_em = new Date();
    return true;
  });
  mock.method(AiAnalysisLog, 'vincularReport', async (id, reportId) => { logs.get(id).report_id = reportId; });

  imageAnalysisService.client = {
    modelo: 'modelo-teste',
    estaConfigurado: () => true,
    analisar: async (buffer) => {
      imagemEnviadaAoGemini = buffer;
      return respostaIa();
    },
  };

  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  mock.restoreAll();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

beforeEach(() => {
  respostaIa = async () => ({
    bloqueioSeguranca: false,
    motivoSeguranca: null,
    dados: { veredito: 'valida', motivo: 'ok', categoria: 'buraco', titulo: 'Buraco', descricao: 'd', prioridade: 'alta', orgao: 'CELESC' },
  });
});

test('análise exige login', async () => {
  const res = await fetch(`${baseUrl}/reports/analise`, { method: 'POST' });
  assert.equal(res.status, 401);
});

test('foto aprovada é reduzida, perde o EXIF e nada é salvo na análise', async () => {
  const { status, corpo } = await enviar('/reports/analise', { arquivo: foto });

  assert.equal(status, 200);
  assert.equal(corpo.data.resultado, 'aprovada');
  assert.equal(corpo.data.sugestoes.orgao, 'CELESC');
  assert.equal(arquivosSalvos().length, 0);

  const enviada = await sharp(imagemEnviadaAoGemini).metadata();
  assert.equal(enviada.width, 1536);
  assert.equal(enviada.exif, undefined);
});

test('fluxo completo: analisa, envia e vincula a auditoria', async () => {
  const analise = await enviar('/reports/analise', { arquivo: foto });
  const { analise_id } = analise.corpo.data;

  const { status } = await enviar('/reports', {
    arquivo: foto,
    campos: { ...camposReport, analise_id, prioridade: 'alta', orgao: 'CELESC' },
  });

  assert.equal(status, 201);
  assert.equal(arquivosSalvos().length, 1);
  assert.equal(logs.get(analise_id).report_id, 'report-1');

  const report = reportsCriados.at(-1);
  assert.equal(report.prioridade, 'alta');
  assert.equal(report.orgao_id, 7);
  assert.match(report.imagem_url, /^\/uploads\/report-/);
});

test('imagem bloqueada não é salva nem pode ser enviada', async () => {
  respostaIa = async () => ({ bloqueioSeguranca: true, motivoSeguranca: 'IMAGE_SAFETY', dados: null });
  const antes = arquivosSalvos().length;

  const analise = await enviar('/reports/analise', { arquivo: foto });
  assert.equal(analise.status, 200);
  assert.equal(analise.corpo.data.resultado, 'bloqueada_impropria');
  assert.equal(analise.corpo.data.analise_id, null);

  const envio = await enviar('/reports', { arquivo: foto, campos: camposReport });
  assert.equal(envio.status, 422);
  assert.equal(arquivosSalvos().length, antes);
});

test('POST /reports com foto e sem análise é recusado sem gravar', async () => {
  const antes = arquivosSalvos().length;
  const { status } = await enviar('/reports', { arquivo: foto, campos: camposReport });

  assert.equal(status, 422);
  assert.equal(arquivosSalvos().length, antes);
});

test('POST /reports sem foto continua permitido', async () => {
  const { status } = await enviar('/reports', { campos: camposReport });
  assert.equal(status, 201);
});

test('prioridade e órgão inválidos são recusados', async () => {
  const prioridade = await enviar('/reports', { campos: { ...camposReport, prioridade: 'maxima' } });
  assert.equal(prioridade.status, 400);

  const orgao = await enviar('/reports', { campos: { ...camposReport, orgao: 'constructor' } });
  assert.equal(orgao.status, 400);
});

test('arquivo disfarçado de JPEG devolve 415', async () => {
  const { status } = await enviar('/reports/analise', { arquivo: Buffer.from('<html><script>alert(1)</script></html>') });
  assert.equal(status, 415);
});

test('extensão não permitida devolve 415', async () => {
  const { status } = await enviar('/reports/analise', { arquivo: foto, nome: 'foto.gif', tipo: 'image/gif' });
  assert.equal(status, 415);
});

test('JPEG corrompido devolve 422', async () => {
  const quebrado = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
  const { status } = await enviar('/reports/analise', { arquivo: quebrado });
  assert.equal(status, 422);
});

test('arquivo acima de 15 MB devolve 413', async () => {
  const { status } = await enviar('/reports/analise', { arquivo: Buffer.alloc(15 * 1024 * 1024 + 1) });
  assert.equal(status, 413);
});

test('limite de análises por usuário devolve 429', async () => {
  const pequena = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#777777' } }).jpeg().toBuffer();
  const status = [];

  for (let i = 0; i < 11; i++) {
    const r = await enviar('/reports/analise', { arquivo: pequena, usuario: 'user-limite' });
    status.push(r.status);
  }

  assert.deepEqual(status.slice(0, 10), Array(10).fill(200));
  assert.equal(status[10], 429);
});
