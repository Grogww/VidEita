const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'erro', mensagem: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findByPk(decoded.id);

    if (!user) return res.status(401).json({ status: 'erro', mensagem: 'Usuário não encontrado' });

    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ status: 'erro', mensagem: msg });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'erro', mensagem: 'Acesso restrito a administradores' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
