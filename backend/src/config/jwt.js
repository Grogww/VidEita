const { randomBytes } = require('crypto');

let secret;

// Segredo do JWT. Se JWT_SECRET não estiver definido, gera um valor aleatório
// em memória: o sistema sobe normalmente, mas as sessões caem a cada reinício.
// Defina JWT_SECRET para manter as sessões entre reinícios.
const getJwtSecret = () => {
  if (secret) return secret;

  if (process.env.JWT_SECRET) {
    secret = process.env.JWT_SECRET;
  } else {
    secret = randomBytes(48).toString('hex');
    console.warn('⚠️ JWT_SECRET não definido: usando segredo aleatório temporário (as sessões expiram ao reiniciar).');
  }

  return secret;
};

module.exports = { getJwtSecret };
