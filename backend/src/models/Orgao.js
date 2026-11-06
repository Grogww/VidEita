const db = require('../config/db');

const Orgao = {
  async findBySigla(sigla) {
    const rows = await db.query(
      'SELECT * FROM orgaos_publicos WHERE sigla = ? AND ativo = 1 LIMIT 1',
      [sigla]
    );
    return rows[0] || null;
  },
};

module.exports = Orgao;
