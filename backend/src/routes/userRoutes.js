const express = require('express');
const router = express.Router();
const { register, login, loginGoogle, getProfile } = require('../controllers/UserController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Cadastrar usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, senha]
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               senha:
 *                 type: string
 *                 minLength: 6
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Nome, e-mail e senha são obrigatórios.
 *       409:
 *         description: Este e-mail já está cadastrado.
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/register', register);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login com e-mail e senha
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@prefeitura.gov.br
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: E-mail e senha são obrigatórios.
 *       401:
 *         description: E-mail ou senha incorretos.
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/login', login);

/**
 * @swagger
 * /users/google:
 *   post:
 *     summary: Login com Google OAuth
 *     description: Recebe o credential/ID token gerado pelo Google Identity Services no frontend, valida no backend e retorna o JWT do VidEita.
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3Yz...
 *     responses:
 *       200:
 *         description: Login com Google realizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Token do Google não fornecido.
 *       401:
 *         description: Token do Google inválido ou e-mail não verificado.
 *       500:
 *         description: GOOGLE_CLIENT_ID não configurado ou erro interno.
 */
router.post('/google', loginGoogle);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obter perfil do usuário autenticado
 *     description: Retorna as informações do usuário atualmente autenticado pelo JWT.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/profile', authMiddleware, getProfile);

module.exports = router;