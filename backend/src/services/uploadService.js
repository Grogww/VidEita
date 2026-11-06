/**
 * Upload de imagens.
 *
 * STORAGE_DRIVER=local  -> salva em /app/uploads e serve por /uploads
 * STORAGE_DRIVER=minio  -> salva no MinIO e serve por /files/:publicId
 *
 * O multer mantém o arquivo em memória nos dois casos: nada é gravado até a
 * imagem passar pela validação e pela análise.
 *
 * Também aceita fotos HEIC/HEIF de celular e converte para JPG antes de salvar.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Minio = require('minio');
const heicConvert = require('heic-convert');
const { createError } = require('../middlewares/errorMiddleware');

const storageDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const minioBucket = process.env.MINIO_BUCKET || 'ocorrencias';
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: String(process.env.MINIO_USE_SSL || 'false') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

let bucketReady = false;

const garantirBucket = async () => {
  if (storageDriver !== 'minio' || bucketReady) return;

  const existe = await minioClient.bucketExists(minioBucket);
  if (!existe) {
    await minioClient.makeBucket(minioBucket, 'us-east-1');
  }

  bucketReady = true;
};

const extensaoLimpa = (originalname = '') => {
  const ext = path.extname(originalname || '').toLowerCase();
  return ext || '.jpg';
};

const gerarNomeArquivo = (originalname = '', forcedExt = null) => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = forcedExt || extensaoLimpa(originalname);
  return `report-${unique}${ext}`;
};

// O middleware validarImagem substitui o mimetype pelo tipo real do arquivo.
const isHeicHeif = (file) => {
  const mime = String(file?.mimetype || '').toLowerCase();
  return mime === 'image/heic' || mime === 'image/heif';
};

const normalizarImagem = async (file) => {
  if (!file) return null;

  // Fotos HEIC/HEIF de celular não abrem bem em muitos navegadores.
  // Então convertemos para JPEG antes de salvar no MinIO.
  if (isHeicHeif(file)) {
    const output = await heicConvert({
      buffer: file.buffer,
      format: 'JPEG',
      quality: 0.9,
    });

    return {
      buffer: Buffer.from(output),
      mimetype: 'image/jpeg',
      originalname: file.originalname.replace(/\.(heic|heif)$/i, '.jpg'),
      ext: '.jpg',
    };
  }

  return {
    buffer: file.buffer,
    mimetype: file.mimetype || 'application/octet-stream',
    originalname: file.originalname || 'imagem.jpg',
    ext: extensaoLimpa(file.originalname),
  };
};

const MIMES_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
// Alguns navegadores não informam o tipo de arquivos HEIC.
const MIMES_GENERICOS = ['', 'application/octet-stream'];

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();

  const mimeOk = MIMES_PERMITIDOS.includes(mime) || MIMES_GENERICOS.includes(mime);
  const extensaoOk = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(name);

  mimeOk && extensaoOk
    ? cb(null, true)
    : cb(createError('Formato não permitido. Envie JPEG, PNG, WebP, HEIC ou HEIF', 415), false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadParaCloudinary = async (file) => {
  if (!file) return { url: null, public_id: null, mime_type: null };

  const normalized = await normalizarImagem(file);
  const filename = gerarNomeArquivo(normalized.originalname, normalized.ext);

  if (storageDriver === 'minio') {
    await garantirBucket();

    await minioClient.putObject(
      minioBucket,
      filename,
      normalized.buffer,
      normalized.buffer.length,
      { 'Content-Type': normalized.mimetype }
    );

    return {
      url: `/files/${encodeURIComponent(filename)}`,
      public_id: filename,
      mime_type: normalized.mimetype,
    };
  }

  await fs.promises.mkdir(uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadDir, filename), normalized.buffer);

  return {
    url: `/uploads/${filename}`,
    public_id: filename,
    mime_type: normalized.mimetype,
  };
};

const removerDoCloudinary = async (publicId) => {
  if (!publicId) return;

  if (storageDriver === 'minio') {
    await garantirBucket();
    try {
      await minioClient.removeObject(minioBucket, publicId);
    } catch (err) {
      if (err.code !== 'NoSuchKey') throw err;
    }
    return;
  }

  const fp = path.join(uploadDir, publicId);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
};

const servirArquivo = async (req, res, next) => {
  try {
    if (storageDriver !== 'minio') {
      return res.status(404).json({ status: 'erro', mensagem: 'Storage MinIO não está ativo' });
    }

    await garantirBucket();

    const publicId = decodeURIComponent(req.params.publicId);
    const stat = await minioClient.statObject(minioBucket, publicId);
    const stream = await minioClient.getObject(minioBucket, publicId);

    res.setHeader('Content-Type', stat.metaData?.['content-type'] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    stream.on('error', next);
    stream.pipe(res);
  } catch (err) {
    if (err.code === 'NoSuchKey' || err.code === 'NotFound') {
      return res.status(404).json({ status: 'erro', mensagem: 'Arquivo não encontrado' });
    }
    next(err);
  }
};

module.exports = {
  upload,
  normalizarImagem,
  uploadParaCloudinary,
  removerDoCloudinary,
  servirArquivo,
};
