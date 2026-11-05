const express = require('express');
const router = express.Router();
const {
  createReport,
  getAllReports,
  getReportsByLocation,
  updateStatus,
  deleteReport,
} = require('../controllers/ReportController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { upload } = require('../services/uploadService');

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Listar ocorrências
 *     description: Usuários comuns veem apenas suas próprias ocorrências. Administradores veem todas.
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendente, em_analise, em_andamento, resolvido, rejeitado]
 *         description: Filtra por status.
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *           example: Buraco
 *         description: Filtra por categoria.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Página da listagem.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Quantidade de registros por página.
 *     responses:
 *       200:
 *         description: Lista de ocorrências retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', authMiddleware, getAllReports);

/**
 * @swagger
 * /reports/nearby:
 *   get:
 *     summary: Buscar ocorrências próximas
 *     description: Retorna ocorrências dentro de um raio em km a partir de uma latitude e longitude.
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           example: -27.0085
 *         description: Latitude do ponto central.
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           example: -51.1517
 *         description: Longitude do ponto central.
 *       - in: query
 *         name: raio
 *         schema:
 *           type: number
 *           example: 5
 *         description: Raio de busca em quilômetros.
 *     responses:
 *       200:
 *         description: Ocorrências próximas retornadas com sucesso.
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
 *                     reports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Report'
 *                     total:
 *                       type: integer
 *                       example: 2
 *                     raio_km:
 *                       type: number
 *                       example: 5
 *                     centro:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: -27.0085
 *                         longitude:
 *                           type: number
 *                           example: -51.1517
 *       400:
 *         description: Parâmetros lat e lng são obrigatórios.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/nearby', authMiddleware, getReportsByLocation);

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Criar nova ocorrência
 *     description: Cria uma ocorrência e, opcionalmente, envia uma imagem para o MinIO. Aceita JPG, PNG, WebP, GIF e HEIC/HEIF quando o backend estiver com conversão habilitada.
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [titulo, categoria, latitude, longitude]
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Buraco na rua
 *               descricao:
 *                 type: string
 *                 example: Buraco grande próximo ao mercado.
 *               categoria:
 *                 type: string
 *                 example: Buraco
 *               bairro:
 *                 type: string
 *                 example: Centro
 *               endereco_texto:
 *                 type: string
 *                 example: Rua XV de Novembro
 *               numero:
 *                 type: string
 *                 example: "123"
 *               complemento:
 *                 type: string
 *                 example: Próximo ao mercado
 *               ponto_referencia:
 *                 type: string
 *                 example: Em frente à praça
 *               latitude:
 *                 type: number
 *                 example: -27.0085
 *               longitude:
 *                 type: number
 *                 example: -51.1517
 *               anonimo:
 *                 type: boolean
 *                 example: false
 *               imagem:
 *                 type: string
 *                 format: binary
 *                 description: Imagem da ocorrência.
 *     responses:
 *       201:
 *         description: Ocorrência criada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateReportResponse'
 *       400:
 *         description: Dados inválidos ou campos obrigatórios ausentes.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', authMiddleware, upload.single('imagem'), createReport);

/**
 * @swagger
 * /reports/{id}/status:
 *   patch:
 *     summary: Atualizar status de uma ocorrência
 *     description: Apenas administradores podem alterar o status.
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da ocorrência.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatusUpdateRequest'
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateReportResponse'
 *       400:
 *         description: Status inválido.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch('/:id/status', authMiddleware, adminMiddleware, updateStatus);

/**
 * @swagger
 * /reports/{id}:
 *   delete:
 *     summary: Excluir uma ocorrência
 *     description: O proprietário da ocorrência ou um administrador pode remover o registro.
 *     tags: [Ocorrências]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da ocorrência.
 *     responses:
 *       200:
 *         description: Ocorrência removida com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: sucesso
 *                 mensagem:
 *                   type: string
 *                   example: Denúncia removida
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:id', authMiddleware, deleteReport);

module.exports = router;