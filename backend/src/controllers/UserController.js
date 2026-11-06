const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { randomUUID } = require('crypto');
const User = require('../models/User');
const { createError } = require('../middlewares/errorMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const gerarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const register = async (req, res, next) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) throw createError('Nome, e-mail e senha são obrigatórios', 400);

    const exists = await User.findOne({ where: { email } });
    if (exists) throw createError('Este e-mail já está cadastrado', 409);

    const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
    const user = await User.create({ nome, email, senha, role });
    const token = gerarToken(user.id);

    return res.status(201).json({
      status: 'sucesso',
      mensagem: 'Usuário cadastrado',
      data: { user: user.toJSON(), token },
    });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) throw createError('E-mail e senha são obrigatórios', 400);

    const user = await User.findOne({ where: { email } });
    if (!user) throw createError('E-mail ou senha incorretos', 401);

    const ok = await user.verificarSenha(senha);
    if (!ok) throw createError('E-mail ou senha incorretos', 401);

    const token = gerarToken(user.id);
    return res.status(200).json({
      status: 'sucesso',
      mensagem: 'Login realizado',
      data: { user: user.toJSON(), token },
    });
  } catch (err) { next(err); }
};


const loginGoogle = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) throw createError('Token do Google não fornecido', 400);
    if (!process.env.GOOGLE_CLIENT_ID) throw createError('GOOGLE_CLIENT_ID não configurado no backend', 500);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) throw createError('Token do Google inválido', 401);
    if (payload.email_verified === false) throw createError('E-mail do Google não verificado', 401);

    let user = await User.findOne({ where: { google_id: payload.sub } });

    if (!user) {
      const byEmail = await User.findOne({ where: { email: payload.email } });
      if (byEmail) {
        await User.linkGoogleAccount(byEmail.id, payload.sub, payload.name || byEmail.nome);
        user = await User.findByPk(byEmail.id);
      } else {
        const role = payload.email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
        user = await User.create({
          nome: payload.name || payload.email.split('@')[0],
          email: payload.email,
          google_id: payload.sub,
          senha: randomUUID(),
          role,
        });
      }
    }

    const token = gerarToken(user.id);
    return res.status(200).json({
      status: 'sucesso',
      mensagem: 'Login com Google realizado',
      data: { user: user.toJSON(), token },
    });
  } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['senha'] } });
    return res.status(200).json({ status: 'sucesso', data: { user: user.toJSON ? user.toJSON() : user } });
  } catch (err) { next(err); }
};

module.exports = { register, login, loginGoogle, getProfile };
