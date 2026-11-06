const { createError } = require('./errorMiddleware');

const MARCAS_HEIC = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const MARCAS_HEIF = new Set(['mif1', 'msf1']);
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Identifica o tipo pelo conteúdo, pois nome e MIME são informados pelo cliente.
const detectarTipoImagem = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(ASSINATURA_PNG)) return 'image/png';

  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (buffer.toString('latin1', 4, 8) === 'ftyp') {
    const marca = buffer.toString('latin1', 8, 12);
    if (MARCAS_HEIC.has(marca)) return 'image/heic';
    if (MARCAS_HEIF.has(marca)) return 'image/heif';
  }

  return null;
};

const validarImagem = (req, res, next) => {
  if (!req.file) return next();

  const tipo = detectarTipoImagem(req.file.buffer);
  if (!tipo) {
    return next(createError('O arquivo enviado não é uma imagem válida', 415));
  }

  req.file.mimetype = tipo;
  return next();
};

module.exports = { detectarTipoImagem, validarImagem };
