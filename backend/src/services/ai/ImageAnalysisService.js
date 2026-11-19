const { createHash } = require('crypto');
const AiAnalysisLog = require('../../models/AiAnalysisLog');
const { createError } = require('../../middlewares/errorMiddleware');
const GeminiClient = require('./GeminiClient');
const ImagePreparer = require('./ImagePreparer');
const { mapear, MENSAGENS } = require('./AnalysisResultMapper');

const calcularHash = (buffer) => createHash('sha256').update(buffer).digest('hex');

class ImageAnalysisService {
  constructor({
    client = new GeminiClient(),
    preparer = new ImagePreparer(),
    logs = AiAnalysisLog,
    permitirSemAnalise = process.env.PERMITIR_CADASTRO_SEM_ANALISE === 'true',
  } = {}) {
    this.client = client;
    this.preparer = preparer;
    this.logs = logs;
    this.permitirSemAnalise = permitirSemAnalise;
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

    const podeEnviar = this.#podeEnviar(analise.resultado);
    const bloqueadaSemAnalise = analise.resultado === 'indisponivel' && !podeEnviar;

    return {
      resultado: analise.resultado,
      analise_id: podeEnviar ? log.id : null,
      motivo: bloqueadaSemAnalise ? MENSAGENS.indisponivel_sem_envio : analise.mensagem,
      sugestoes: analise.sugestoes,
    };
  }

  #podeEnviar(resultado) {
    return resultado === 'aprovada' || (resultado === 'indisponivel' && this.permitirSemAnalise);
  }

  // Falha da IA vira "indisponivel"; o envio depende de PERMITIR_CADASTRO_SEM_ANALISE.
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

    if (!this.#podeEnviar(log.resultado)) {
      throw createError('Esta imagem não foi aprovada na análise e não pode ser enviada', 422);
    }

    if (!(await this.logs.consumir(log.id))) {
      throw createError('A análise desta foto expirou ou já foi usada. Remova-a e anexe novamente', 422);
    }

    return log;
  }
}

module.exports = ImageAnalysisService;
