const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
require('dotenv').config();

const userRoutes = require('./src/routes/userRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const { errorMiddleware } = require('./src/middlewares/errorMiddleware');
const { servirArquivo } = require('./src/services/uploadService');

const app = express();

// ─── Middlewares globais ───────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir uploads locais antigos e arquivos novos vindos do MinIO
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/files/:publicId', servirArquivo);

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    nome: 'Urban Reports API',
    versao: '1.0.0',
    endpoints: {
      usuarios: '/users',
      Ocorrência: '/reports',
    },
  });
});

app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'VidEita API Docs',
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #4E2D78; }
    .swagger-ui .btn.authorize { border-color: #6B3FA0; color: #6B3FA0; }
    .swagger-ui .btn.authorize svg { fill: #6B3FA0; }
  `,
}));

app.use('/users', userRoutes);
app.use('/reports', reportRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    status: 'erro',
    mensagem: `Rota ${req.method} ${req.originalUrl} não encontrada`,
  });
});

// ─── Tratamento global de erros ───────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;