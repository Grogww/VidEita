const errorMiddleware = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO:`, err.message);

  // Erros de validação do Sequelize
  if (err.name === 'SequelizeValidationError') {
    const erros = err.errors.map((e) => ({
      campo: e.path,
      mensagem: e.message,
    }));
    return res.status(400).json({
      status: 'erro',
      mensagem: 'Dados inválidos',
      erros,
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: 'erro',
      mensagem: 'Registro duplicado',
      campo: err.errors[0]?.path,
    });
  }

  // Erros de JWT (já tratados no middleware, mas por segurança)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'Token inválido',
    });
  }

  // Erros de upload do multer
  if (err.name === 'MulterError') {
    const muitoGrande = err.code === 'LIMIT_FILE_SIZE';
    return res.status(muitoGrande ? 413 : 400).json({
      status: 'erro',
      mensagem: muitoGrande ? 'Imagem muito grande (máx 15MB)' : 'Falha no envio do arquivo',
    });
  }

  // Erro genérico
  const statusCode = err.statusCode || 500;
  const mensagem =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Erro interno do servidor'
      : err.message;

  return res.status(statusCode).json({
    status: 'erro',
    mensagem,
  });
};

// Helper para criar erros com statusCode
const createError = (mensagem, statusCode = 400) => {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorMiddleware, createError };
