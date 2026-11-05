const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VidEita API',
      version: '1.0.0',
      description: [
        'Documentação da API do sistema VidEita.',
        '',
        'Use o botão **Authorize** e informe o token JWT no formato:',
        '',
        '`7236f7c4-c925-40d6-a722-56200db67e79`',
        '',
        'O token é retornado nas rotas de login comum e login com Google.'
      ].join('\n'),
      contact: {
        name: 'VidEita',
        email: 'VideEita@videra.sc.gov.br',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Via Nginx, localhost:8080 ou ngrok',
      },
      {
        url: 'http://localhost:3000',
        description: 'Backend direto, desenvolvimento local',
      },
    ],
    tags: [
      { name: 'Usuários', description: 'Cadastro, login, Google OAuth e perfil' },
      { name: 'Ocorrências', description: 'Criação, listagem, mapa e gestão de ocorrências' },
      { name: 'Arquivos', description: 'Arquivos/imagens servidos pelo backend a partir do MinIO' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Informe: Bearer SEU_TOKEN_AQUI',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'erro' },
            mensagem: { type: 'string', example: 'Token não fornecido' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '7d79e8df-2a6e-4c05-855f-cb91eeb7e35f' },
            nome: { type: 'string', example: 'Matheus Varela' },
            email: { type: 'string', format: 'email', example: 'matheus@email.com' },
            google_id: { type: 'string', nullable: true, example: '109876543210987654321' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            ativo: { type: 'integer', example: 1 },
            telefone: { type: 'string', nullable: true, example: '(49) 99999-9999' },
            bairro: { type: 'string', nullable: true, example: 'Centro' },
            criado_em: { type: 'string', format: 'date-time', example: '2026-06-21T20:00:00.000Z' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'sucesso' },
            mensagem: { type: 'string', example: 'Login realizado' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'd779e8df-2a6e-4c05-855f-cb91eeb7e35f' },
            titulo: { type: 'string', example: 'Buraco na rua' },
            descricao: { type: 'string', nullable: true, example: 'Buraco grande próximo ao mercado.' },
            categoria: { type: 'string', example: 'Buraco' },
            bairro: { type: 'string', nullable: true, example: 'Centro' },
            endereco_texto: { type: 'string', nullable: true, example: 'Rua XV de Novembro' },
            numero: { type: 'string', nullable: true, example: '123' },
            complemento: { type: 'string', nullable: true, example: 'Próximo ao mercado' },
            ponto_referencia: { type: 'string', nullable: true, example: 'Em frente à praça' },
            latitude: { type: 'number', format: 'double', example: -27.0085 },
            longitude: { type: 'number', format: 'double', example: -51.1517 },
            imagem_url: { type: 'string', nullable: true, example: '/files/report-1781048735302-745919602.jpg' },
            imagem_public_id: { type: 'string', nullable: true, example: 'report-1781048735302-745919602.jpg' },
            status: {
              type: 'string',
              enum: ['pendente', 'em_analise', 'em_andamento', 'resolvido', 'rejeitado'],
              example: 'pendente',
            },
            prioridade: { type: 'string', nullable: true, example: 'normal' },
            user_id: { type: 'string', format: 'uuid', example: '7d79e8df-2a6e-4c05-855f-cb91eeb7e35f' },
            anonimo: { type: 'boolean', example: false },
            criado_em: { type: 'string', format: 'date-time', example: '2026-06-21T20:00:00.000Z' },
            atualizado_em: { type: 'string', format: 'date-time', example: '2026-06-21T20:00:00.000Z' },
            autor: { $ref: '#/components/schemas/ReportAuthor' },
          },
        },
        ReportAuthor: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid', example: '7d79e8df-2a6e-4c05-855f-cb91eeb7e35f' },
            nome: { type: 'string', example: 'Matheus Varela' },
            email: { type: 'string', format: 'email', example: 'matheus@email.com' },
            role: { type: 'string', example: 'user' },
            anonimo: { type: 'boolean', example: false },
          },
        },
        ReportListResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'sucesso' },
            data: {
              type: 'object',
              properties: {
                reports: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Report' },
                },
                paginacao: { $ref: '#/components/schemas/Paginacao' },
              },
            },
          },
        },
        Paginacao: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 12 },
            pagina: { type: 'integer', example: 1 },
            limite: { type: 'integer', example: 20 },
            paginas: { type: 'integer', example: 1 },
          },
        },
        CreateReportResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'sucesso' },
            mensagem: { type: 'string', example: 'Denúncia criada' },
            data: {
              type: 'object',
              properties: {
                report: { $ref: '#/components/schemas/Report' },
              },
            },
          },
        },
        StatusUpdateRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['pendente', 'em_analise', 'em_andamento', 'resolvido', 'rejeitado'],
              example: 'em_analise',
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token inválido, ausente ou expirado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Forbidden: {
          description: 'Usuário autenticado, mas sem permissão para executar esta ação.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Registro não encontrado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        InternalError: {
          description: 'Erro interno do servidor.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './app.js'],
};

module.exports = swaggerJsdoc(options);