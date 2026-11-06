const { randomUUID } = require('crypto');
const db = require('../config/db');

const VALIDADE_MINUTOS = 30;

const AiAnalysisLog = {
  async create(data) {
    const id = randomUUID();

    await db.execute(
      `INSERT INTO ai_analysis_logs
       (id, user_id, imagem_sha256, modelo, resultado, motivo, resposta_json, tempo_ms, erro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.user_id,
        data.imagem_sha256,
        data.modelo || null,
        data.resultado,
        data.motivo ? String(data.motivo).slice(0, 500) : null,
        data.resposta_json ? JSON.stringify(data.resposta_json) : null,
        data.tempo_ms ?? null,
        data.erro ? String(data.erro).slice(0, 500) : null,
      ]
    );

    return this.findByPk(id);
  },

  async findByPk(id) {
    const rows = await db.query('SELECT * FROM ai_analysis_logs WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  // Atômico: duas requisições simultâneas não conseguem usar a mesma análise.
  async consumir(id) {
    const result = await db.execute(
      `UPDATE ai_analysis_logs
       SET consumido_em = CURRENT_TIMESTAMP(3)
       WHERE id = ?
         AND consumido_em IS NULL
         AND criado_em >= CURRENT_TIMESTAMP(3) - INTERVAL ${VALIDADE_MINUTOS} MINUTE`,
      [id]
    );

    return result.affectedRows === 1;
  },

  async vincularReport(id, reportId) {
    await db.execute('UPDATE ai_analysis_logs SET report_id = ? WHERE id = ?', [reportId, id]);
  },
};

module.exports = AiAnalysisLog;
