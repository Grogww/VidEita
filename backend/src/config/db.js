const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

let pool;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'base_projeto_integrador',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: false,
  charset: 'utf8mb4',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getPool = () => {
  if (!pool) pool = mysql.createPool(config);
  return pool;
};

const execute = async (sql, params = []) => {
  const [result] = await getPool().execute(sql, params);
  return result;
};

const query = async (sql, params = []) => {
  const [rows] = await getPool().query(sql, params);
  return rows;
};

const serialize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  ['update', 'destroy', 'toJSON', 'get', 'verificarSenha'].forEach(k => delete copy[k]);
  Object.keys(copy).forEach(k => {
    if (copy[k] instanceof Date) copy[k] = copy[k].toISOString();
    if (copy[k] && typeof copy[k] === 'object' && !Array.isArray(copy[k])) {
      copy[k] = serialize(copy[k]);
    }
  });
  return copy;
};

const normalizeBool = (value) => value === true || value === 1 || value === '1' || value === 'true';


const ensureGoogleAuthColumns = async () => {
  try {
    const columns = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id'`,
      [config.database]
    );

    if (!columns.length) {
      await execute(`ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER email`);
      console.log('🔐 Coluna users.google_id criada');
    }

    const indexes = await query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'uk_users_google_id'`,
      [config.database]
    );

    if (!indexes.length) {
      await execute(`ALTER TABLE users ADD UNIQUE KEY uk_users_google_id (google_id)`);
      console.log('🔐 Índice users.google_id criado');
    }
  } catch (err) {
    console.log(`⚠️ Não foi possível ajustar colunas do Google Auth: ${err.message}`);
  }
};

// Os scripts de database/init só rodam com o volume vazio. Isto cobre bancos já criados.
const ensureAiSchema = async () => {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS ai_analysis_logs (
        id CHAR(36) NOT NULL,
        user_id CHAR(36) NULL,
        report_id CHAR(36) NULL,
        imagem_sha256 CHAR(64) NOT NULL,
        modelo VARCHAR(60) NULL,
        resultado ENUM('aprovada','bloqueada_impropria','bloqueada_fora_escopo','indisponivel') NOT NULL,
        motivo VARCHAR(500) NULL,
        resposta_json JSON NULL,
        tempo_ms INT UNSIGNED NULL,
        erro VARCHAR(500) NULL,
        consumido_em DATETIME(3) NULL,
        criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_ai_analysis_logs_user_created (user_id, criado_em),
        KEY idx_ai_analysis_logs_report (report_id),
        KEY idx_ai_analysis_logs_resultado (resultado, criado_em),
        CONSTRAINT fk_ai_analysis_logs_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_ai_analysis_logs_report
          FOREIGN KEY (report_id) REFERENCES reports(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const orgaos = [
      ['Centrais Elétricas de Santa Catarina', 'CELESC', 'Rede elétrica e postes.'],
      ['VISAN', 'VISAN', 'Abastecimento de água e esgoto.'],
    ];

    for (const [nome, sigla, endereco] of orgaos) {
      const existente = await query('SELECT id FROM orgaos_publicos WHERE sigla = ? LIMIT 1', [sigla]);
      if (!existente.length) {
        await execute('INSERT INTO orgaos_publicos (nome, sigla, endereco) VALUES (?, ?, ?)', [nome, sigla, endereco]);
        console.log(`🏛️ Órgão ${sigla} criado`);
      }
    }
  } catch (err) {
    console.log(`⚠️ Não foi possível ajustar o schema do módulo de IA: ${err.message}`);
  }
};

const ensureSeedAdmin = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';

  if (!email || !password) return;

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const hash = await bcrypt.hash(password, 12);

  if (existing.length) {
    await execute(
      'UPDATE users SET nome = ?, senha = ?, role = ?, ativo = 1 WHERE email = ?',
      [name, hash, 'admin', email]
    );
    console.log(`👤 Admin de desenvolvimento atualizado: ${email}`);
    return;
  }

  await execute(
    `INSERT INTO users (id, nome, email, senha, role, ativo)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    [randomUUID(), name, email, hash]
  );
  console.log(`👤 Admin de desenvolvimento criado: ${email}`);
};

const connectDatabase = async () => {
  const retries = Number(process.env.DB_CONNECT_RETRIES || 30);
  const delay = Number(process.env.DB_CONNECT_DELAY_MS || 2000);
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await getPool().getConnection();
      await connection.ping();
      connection.release();
      console.log(`✅ MySQL conectado em ${config.host}:${config.port}/${config.database}`);
      await ensureGoogleAuthColumns();
      await ensureAiSchema();
      await ensureSeedAdmin();
      return;
    } catch (err) {
      lastError = err;
      console.log(`⏳ Aguardando MySQL (${attempt}/${retries}): ${err.message}`);
      await sleep(delay);
    }
  }

  throw lastError;
};

module.exports = {
  getPool,
  execute,
  query,
  serialize,
  normalizeBool,
  connectDatabase,
};
