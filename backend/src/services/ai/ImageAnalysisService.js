const { createHash } = require('crypto');
const AiAnalysisLog = require('../../models/AiAnalysisLog');
const { createError } = require('../../middlewares/errorMiddleware');
const GeminiClient = require('./GeminiClient');
const ImagePreparer = require('./ImagePreparer');
const { mapear, MENSAGENS } = require('./AnalysisResultMapper');

const RESULTADOS_ENVIAVEIS = ['aprovada', 'indisponivel'];

const calcularHash = (buffer) => createHash('sha256').update(buffer).digest('hex');

class ImageAnalysisService {
  constructor({
    client = new GeminiClient(),
    preparer = new ImagePreparer(),
    logs = AiAnalysisLog,
  } = {}) {
    this.client = client;
    this.preparer = preparer;
    this.logs = logs;
  }

  async analisar(file, userId) {
    let imagem;
    try {
      imagem = await this.preparer.preparar(file);
    } catch (err) {
      throw createError('Não foi possível ler esta imagem. Tente outra foto', 422);
    }

    const inicio = Date.now();
    const { analise, resposta, erro } = await this.#consultarIa(imagem);

    const log = await this.logs.create({
      user_id: userId,
      imagem_sha256: calcularHash(file.buffer),
      modelo: this.client.modelo,
      resultado: analise.resultado,
      motivo: analise.motivo,
      resposta_json: resposta,
      tempo_ms: Date.now() - inicio,
      erro,
    });

    return {
      resultado: analise.resultado,
      analise_id: RESULTADOS_ENVIAVEIS.includes(analise.resultado) ? log.id : null,
      motivo: analise.mensagem,
      sugestoes: analise.sugestoes,
    };
  }

  // Falha da IA não impede o registro: a ocorrência segue sem sugestões.
  async #consultarIa(imagem) {
    const indisponivel = { resultado: 'indisponivel', motivo: null, mensagem: MENSAGENS.indisponivel, sugestoes: null };

    if (!this.client.estaConfigurado()) {
      return { analise: indisponivel, resposta: null, erro: 'GEMINI_API_KEY não configurada' };
    }

    let resposta = null;
    try {
      resposta = await this.client.analisar(imagem.buffer, imagem.mimeType);
      return { analise: mapear(resposta), resposta, erro: null };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Falha na análise de imagem:`, err.message);
      return { analise: indisponivel, resposta, erro: err.message };
    }
  }

  // Garante que a foto enviada é a mesma que passou pela análise deste usuário.
  async validarParaEnvio(analiseId, file, userId) {
    const naoAnalisada = 'Esta foto precisa ser analisada antes do envio. Remova-a e anexe novamente';

    if (!analiseId) throw createError(naoAnalisada, 422);

    const log = await this.logs.findByPk(analiseId);
    if (!log || log.user_id !== userId || log.imagem_sha256 !== calcularHash(file.buffer)) {
      throw createError(naoAnalisada, 422);
    }

    if (!RESULTADOS_ENVIAVEIS.includes(log.resultado)) {
      throw createError('Esta imagem foi bloqueada e não pode ser enviada', 422);
    }

    if (!(await this.logs.consumir(log.id))) {
      throw createError('A análise desta foto expirou ou já foi usada. Remova-a e anexe novamente', 422);
    }

    return log;
  }
}

module.exports = ImageAnalysisService;
