const sharp = require('sharp');
const { normalizarImagem } = require('./uploadService');

const MARGEM = 0.15;
const BLOCOS = 8;

// Converte [ymin, xmin, ymax, xmax] de 0 a 1000 em pixels, com folga em volta.
const paraPixels = ([ymin, xmin, ymax, xmax], largura, altura) => {
  const folgaX = (xmax - xmin) * MARGEM;
  const folgaY = (ymax - ymin) * MARGEM;
  const left = Math.max(0, Math.floor(((xmin - folgaX) / 1000) * largura));
  const top = Math.max(0, Math.floor(((ymin - folgaY) / 1000) * altura));
  const right = Math.min(largura, Math.ceil(((xmax + folgaX) / 1000) * largura));
  const bottom = Math.min(altura, Math.ceil(((ymax + folgaY) / 1000) * altura));
  return { left, top, width: right - left, height: bottom - top };
};

const pixelizar = async (pixels, formato, area) => {
  const reduzida = await sharp(pixels, formato).extract(area).resize(BLOCOS, BLOCOS, { fit: 'fill' }).png().toBuffer();
  return sharp(reduzida).resize(area.width, area.height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
};

// Gira como na análise para as coordenadas baterem e regrava sem EXIF nem GPS.
const censurarImagem = async (file, areas = []) => {
  const normalizada = await normalizarImagem(file);
  const { data, info } = await sharp(normalizada.buffer).rotate().raw().toBuffer({ resolveWithObject: true });
  const formato = { raw: { width: info.width, height: info.height, channels: info.channels } };

  const tarjas = await Promise.all(
    areas
      .map((box) => paraPixels(box, info.width, info.height))
      .filter((area) => area.width > 0 && area.height > 0)
      .map(async (area) => ({ input: await pixelizar(data, formato, area), left: area.left, top: area.top }))
  );

  const buffer = await sharp(data, formato).composite(tarjas).jpeg({ quality: 85 }).toBuffer();
  return { buffer, mimetype: 'image/jpeg', originalname: 'imagem.jpg' };
};

module.exports = { censurarImagem };
