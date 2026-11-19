const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { censurarImagem } = require('../src/services/imageCensor');

const LARGURA = 400;
const ALTURA = 200;

// Listras verticais de 2 px: depois de pixelizadas, viram um cinza quase uniforme.
const criarFoto = async (orientacao) => {
  const pixels = Buffer.alloc(LARGURA * ALTURA * 3);
  for (let i = 0; i < LARGURA * ALTURA; i++) {
    const x = i % LARGURA;
    pixels.fill(Math.floor(x / 2) % 2 ? 255 : 0, i * 3, i * 3 + 3);
  }

  let img = sharp(pixels, { raw: { width: LARGURA, height: ALTURA, channels: 3 } });
  if (orientacao) img = img.withMetadata({ orientation: orientacao });
  return { buffer: await img.jpeg({ quality: 100 }).toBuffer(), mimetype: 'image/jpeg', originalname: 'foto.jpg' };
};

const variacao = async (buffer, regiao) => {
  const data = await sharp(buffer).extract(regiao).greyscale().raw().toBuffer();
  return Math.max(...data) - Math.min(...data);
};

test('pixeliza só a área marcada e devolve JPEG', async () => {
  const r = await censurarImagem(await criarFoto(), [[250, 250, 750, 500]]);
  const meta = await sharp(r.buffer).metadata();

  assert.equal(r.mimetype, 'image/jpeg');
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, LARGURA);
  assert.ok(await variacao(r.buffer, { left: 110, top: 60, width: 80, height: 80 }) < 60);
  assert.ok(await variacao(r.buffer, { left: 300, top: 60, width: 80, height: 80 }) > 150);
});

test('sem áreas a imagem é regravada sem EXIF', async () => {
  const comExif = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#777777' } })
    .withExif({ IFD0: { Copyright: 'dado-privado' } })
    .jpeg()
    .toBuffer();

  const r = await censurarImagem({ buffer: comExif, mimetype: 'image/jpeg', originalname: 'f.jpg' });
  assert.equal((await sharp(r.buffer).metadata()).exif, undefined);
});

test('aplica a orientação EXIF antes de censurar, como na análise', async () => {
  const r = await censurarImagem(await criarFoto(6), [[0, 0, 100, 100]]);
  const meta = await sharp(r.buffer).metadata();

  assert.equal(meta.width, ALTURA);
  assert.equal(meta.height, LARGURA);
});

test('caixa encostada na borda não estoura o tamanho da imagem', async () => {
  const r = await censurarImagem(await criarFoto(), [[900, 900, 1000, 1000]]);
  assert.equal((await sharp(r.buffer).metadata()).width, LARGURA);
});
