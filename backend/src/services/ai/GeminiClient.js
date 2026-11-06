const { GoogleGenAI } = require('@google/genai');
const { SYSTEM_PROMPT, USER_PROMPT, RESPONSE_SCHEMA } = require('./analysisPrompt');

const MOTIVOS_DE_SEGURANCA = new Set([
  'SAFETY',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
]);

// Só falhas temporárias do servidor. O 429 fica de fora: repetir não recupera cota esgotada.
const NOVAS_TENTATIVAS = { attempts: 3, initialDelay: 1, httpStatusCodes: [500, 503, 504] };

class GeminiClient {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    modelo = process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 40000),
    sdk = null,
  } = {}) {
    this.apiKey = apiKey;
    this.modelo = modelo;
    this.timeoutMs = timeoutMs;
    this.sdk = sdk;
  }

  estaConfigurado() {
    return Boolean(this.apiKey);
  }

  async analisar(buffer, mimeType) {
    if (!this.sdk) this.sdk = new GoogleGenAI({ apiKey: this.apiKey });

    const response = await this.sdk.models.generateContent({
      model: this.modelo,
      contents: [
        { inlineData: { data: buffer.toString('base64'), mimeType } },
        USER_PROMPT,
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        httpOptions: { retryOptions: NOVAS_TENTATIVAS },
        // Vale para todas as tentativas somadas.
        abortSignal: AbortSignal.timeout(this.timeoutMs),
      },
    });

    const motivoBloqueio = response.promptFeedback?.blockReason;
    const motivoFim = response.candidates?.[0]?.finishReason;
    const motivoSeguranca = [motivoBloqueio, motivoFim].find((m) => MOTIVOS_DE_SEGURANCA.has(m));

    if (motivoSeguranca) {
      return { bloqueioSeguranca: true, motivoSeguranca, dados: null };
    }

    return { bloqueioSeguranca: false, motivoSeguranca: null, dados: JSON.parse(response.text) };
  }
}

module.exports = GeminiClient;
