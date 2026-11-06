const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectarTipoImagem, validarImagem } = require('../src/middlewares/imageValidationMiddleware');

const preencher = (inicio) => Buffer.concat([inicio, Buffer.alloc(16)]);

test('reconhece os formatos permitidos pelo conteúdo', () => {
  assert.equal(detectarTipoImagem(preencher(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))), 'image/jpeg');
  assert.equal(detectarTipoImagem(preencher(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))), 'image/png');
  assert.equal(detectarTipoImagem(preencher(Buffer.from('RIFF\0\0\0\0WEBP', 'latin1'))), 'image/webp');
  assert.equal(detectarTipoImagem(preencher(Buffer.from('\0\0\0\x18ftypheic', 'latin1'))), 'image/heic');
  assert.equal(detectarTipoImagem(preencher(Buffer.from('\0\0\0\x18ftypmif1', 'latin1'))), 'image/heif');
});

test('recusa conteúdo que não é imagem permitida', () => {
  assert.equal(detectarTipoImagem(preencher(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))), null);
  assert.equal(detectarTipoImagem(preencher(Buffer.from('GIF89a'))), null);
  assert.equal(detectarTipoImagem(preencher(Buffer.from('\0\0\0\x18ftypavif', 'latin1'))), null);
  assert.equal(detectarTipoImagem(Buffer.alloc(3)), null);
  assert.equal(detectarTipoImagem(undefined), null);
});

test('validarImagem troca o MIME informado pelo tipo real', () => {
  const req = { file: { buffer: preencher(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), mimetype: 'image/png' } };
  validarImagem(req, {}, (err) => assert.equal(err, undefined));
  assert.equal(req.file.mimetype, 'image/jpeg');
});

test('validarImagem devolve 415 para arquivo disfarçado', () => {
  const req = { file: { buffer: preencher(Buffer.from('<html><script>')), mimetype: 'image/png' } };
  validarImagem(req, {}, (err) => assert.equal(err.statusCode, 415));
});

test('validarImagem ignora requisição sem arquivo', () => {
  validarImagem({}, {}, (err) => assert.equal(err, undefined));
});
