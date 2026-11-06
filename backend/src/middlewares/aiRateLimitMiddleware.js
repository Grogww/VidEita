const { rateLimit } = require('express-rate-limit');

// Cada análise tem custo. O limite é por usuário, por isso roda depois do authMiddleware.
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.id),
  // A chave não usa o IP, então o X-Forwarded-For enviado pelo Nginx não interfere.
  validate: { xForwardedForHeader: false },
  message: {
    status: 'erro',
    mensagem: 'Muitas análises em pouco tempo. Aguarde um minuto e tente novamente',
  },
});

module.exports = { aiRateLimit };
