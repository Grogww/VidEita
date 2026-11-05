const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../config/db');

const wrapUser = (raw) => {
  if (!raw) return null;
  const inst = { ...raw };

  inst.verificarSenha = async (plain) => bcrypt.compare(plain, inst.senha || '');

  inst.toJSON = () => {
    const value = db.serialize(inst);
    delete value.senha;
    return value;
  };

  inst.get = inst.toJSON;
  return inst;
};

const buildWhere = (where = {}) => {
  const entries = Object.entries(where).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return { clause: '', params: [] };
  return {
    clause: `WHERE ${entries.map(([field]) => `${field} = ?`).join(' AND ')}`,
    params: entries.map(([, value]) => value),
  };
};

const User = {
  async create(data) {
    const id = data.id || randomUUID();
    const hash = await bcrypt.hash(data.senha, 12);
    await db.execute(
      `INSERT INTO users (id, nome, email, google_id, senha, role, ativo, telefone, bairro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.nome,
        data.email,
        data.google_id || null,
        hash,
        data.role || 'user',
        data.ativo === undefined ? 1 : Number(data.ativo),
        data.telefone || null,
        data.bairro || null,
      ]
    );
    return this.findByPk(id);
  },

  async findByPk(id, { attributes } = {}) {
    let rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return null;
    let row = rows[0];
    if (attributes?.exclude?.length) {
      row = { ...row };
      attributes.exclude.forEach(field => delete row[field]);
    }
    return wrapUser(row);
  },

  async findOne({ where = {} } = {}) {
    const { clause, params } = buildWhere(where);
    const rows = await db.query(`SELECT * FROM users ${clause} LIMIT 1`, params);
    return wrapUser(rows[0]);
  },

  async linkGoogleAccount(id, googleId, nome) {
    await db.execute(
      `UPDATE users SET google_id = ?, nome = COALESCE(NULLIF(?, ''), nome) WHERE id = ?`,
      [googleId, nome || null, id]
    );
    return this.findByPk(id);
  },

  async findAll({ where = {}, order } = {}) {
    const { clause, params } = buildWhere(where);
    let orderClause = 'ORDER BY criado_em DESC';
    if (order?.length) {
      orderClause = `ORDER BY ${order.map(([field, dir]) => `${field} ${String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`).join(', ')}`;
    }
    const rows = await db.query(`SELECT * FROM users ${clause} ${orderClause}`, params);
    return rows.map(wrapUser);
  },
};

module.exports = User;
