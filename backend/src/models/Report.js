const { randomUUID } = require('crypto');
const db = require('../config/db');

const validFields = new Set([
  'id', 'titulo', 'descricao', 'categoria', 'latitude', 'longitude',
  'imagem_url', 'imagem_public_id', 'status', 'user_id', 'anonimo',
  'bairro', 'endereco_texto', 'numero', 'complemento', 'ponto_referencia',
  'prioridade', 'data_encerramento'
]);

const buildWhere = (where = {}) => {
  const entries = Object.entries(where)
    .filter(([field, value]) => validFields.has(field) && value !== undefined && value !== null && value !== '');

  if (!entries.length) return { clause: '', params: [] };

  return {
    clause: `WHERE ${entries.map(([field]) => `r.${field} = ?`).join(' AND ')}`,
    params: entries.map(([, value]) => value),
  };
};

const buildOrder = (order) => {
  if (!order?.length) return 'ORDER BY r.criado_em DESC';
  return `ORDER BY ${order.map(([field, dir]) => {
    const safeField = validFields.has(field) ? field : 'criado_em';
    const safeDir = String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return `r.${safeField} ${safeDir}`;
  }).join(', ')}`;
};

const baseSelect = `
  SELECT
    r.*,
    u.nome AS autor_nome,
    u.email AS autor_email,
    u.role AS autor_role
  FROM reports r
  LEFT JOIN users u ON u.id = r.user_id
`;

const wrapReport = (raw, include = false) => {
  if (!raw) return null;

  const inst = { ...raw };
  inst.anonimo = Boolean(inst.anonimo);
  inst.latitude = Number(inst.latitude);
  inst.longitude = Number(inst.longitude);

  if (include) {
    if (inst.anonimo) {
      inst.autor = { nome: 'Anônimo', anonimo: true };
      delete inst.user_id;
    } else {
      inst.autor = inst.autor_nome ? {
        id: inst.user_id,
        nome: inst.autor_nome,
        email: inst.autor_email,
        role: inst.autor_role,
      } : null;
    }
  }

  delete inst.autor_nome;
  delete inst.autor_email;
  delete inst.autor_role;

  inst.update = async (changes) => {
    const allowed = Object.entries(changes).filter(([field]) => validFields.has(field) && field !== 'id');
    if (!allowed.length) return inst;

    await db.execute(
      `UPDATE reports SET ${allowed.map(([field]) => `${field} = ?`).join(', ')} WHERE id = ?`,
      [...allowed.map(([, value]) => value), raw.id]
    );

    const updated = await Report.findByPk(raw.id, { include });
    Object.assign(inst, updated ? updated.toJSON() : {});
    return inst;
  };

  inst.destroy = async () => {
    await db.execute('DELETE FROM reports WHERE id = ?', [raw.id]);
  };

  inst.toJSON = () => db.serialize(inst);
  inst.get = inst.toJSON;

  return inst;
};

const Report = {
  async create(data) {
    const id = data.id || randomUUID();
    const status = data.status || 'pendente';
    const anonimo = db.normalizeBool(data.anonimo) ? 1 : 0;

    await db.execute(
      `INSERT INTO reports
       (id, titulo, descricao, categoria, latitude, longitude, imagem_url, imagem_public_id, status, user_id, anonimo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.titulo,
        data.descricao || null,
        data.categoria,
        Number(data.latitude),
        Number(data.longitude),
        data.imagem_url || null,
        data.imagem_public_id || null,
        status,
        data.user_id,
        anonimo,
      ]
    );

    if (data.imagem_url && data.imagem_public_id) {
      await db.execute(
        `INSERT INTO report_attachments (report_id, nome_arquivo, url, public_id, mime_type, descricao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.imagem_public_id, data.imagem_url, data.imagem_public_id, data.mime_type || null, 'Imagem principal']
      );
    }

    return this.findByPk(id);
  },

  async findByPk(id, opts = {}) {
    const rows = await db.query(`${baseSelect} WHERE r.id = ? LIMIT 1`, [id]);
    return wrapReport(rows[0], Boolean(opts.include));
  },

  async findOne({ where = {}, include = false } = {}) {
    const { clause, params } = buildWhere(where);
    const rows = await db.query(`${baseSelect} ${clause} LIMIT 1`, params);
    return wrapReport(rows[0], Boolean(include));
  },

  async findAll({ where = {}, include = false, order, limit, offset } = {}) {
    const { clause, params } = buildWhere(where);
    const orderClause = buildOrder(order);
    const safeLimit = limit ? Math.max(1, Number(limit)) : null;
    const safeOffset = offset ? Math.max(0, Number(offset)) : 0;

    let sql = `${baseSelect} ${clause} ${orderClause}`;
    const finalParams = [...params];

    if (safeLimit) {
      sql += ' LIMIT ? OFFSET ?';
      finalParams.push(safeLimit, safeOffset);
    }

    const rows = await db.query(sql, finalParams);
    return rows.map(row => wrapReport(row, Boolean(include)));
  },

  async findAndCountAll({ where = {}, include = false, order, limit, offset } = {}) {
    const { clause, params } = buildWhere(where);
    const countRows = await db.query(`SELECT COUNT(*) AS total FROM reports r ${clause}`, params);
    const rows = await this.findAll({ where, include, order, limit, offset });
    return { count: Number(countRows[0]?.total || 0), rows };
  },

  async update(data, { where = {} } = {}) {
    const updates = Object.entries(data).filter(([field]) => validFields.has(field) && field !== 'id');
    const whereEntries = Object.entries(where)
      .filter(([field, value]) => validFields.has(field) && value !== undefined && value !== null && value !== '');

    if (!updates.length || !whereEntries.length) return [0];

    const setClause = updates.map(([field]) => `${field} = ?`).join(', ');
    const whereClause = whereEntries.map(([field]) => `${field} = ?`).join(' AND ');

    const result = await db.execute(
      `UPDATE reports SET ${setClause} WHERE ${whereClause}`,
      [...updates.map(([, value]) => value), ...whereEntries.map(([, value]) => value)]
    );

    return [result.affectedRows || 0];
  },

  async destroy({ where = {} } = {}) {
    const built = buildWhere(where);
    if (!built.clause) return 0;
    const result = await db.execute(`DELETE r FROM reports r ${built.clause}`, built.params);
    return result.affectedRows || 0;
  },
};

module.exports = Report;
