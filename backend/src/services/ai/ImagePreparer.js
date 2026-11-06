const sharp = require('sharp');
const { normalizarImagem } = require('../uploadService');

const LADO_MAXIMO = 1536;

class ImagePreparer {
  // Reduzir a foto mantém a requisição abaixo do limite de 20 MB do Gemini.
  // O sharp descarta EXIF e GPS por padrão, então a localização não sai do sistema.
  async preparar(file) {
    const normalizada = await normalizarImagem(file);

    const buffer = await sharp(normalizada.buffer)
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { buffer, mimeType: 'image/jpeg' };
  }
}

module.exports = ImagePreparer;
