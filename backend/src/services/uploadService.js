/**
 * Upload de imagens.
 *
 * STORAGE_DRIVER=local  -> salva em /app/uploads e serve por /uploads
 * STORAGE_DRIVER=minio  -> salva no MinIO e serve por /files/:publicId
 *
 * Também aceita fotos HEIC/HEIF de celular e converte para JPG antes de salvar.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Minio = require('minio');
const heicConvert = require('heic-convert');

const storageDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const minioBucket = process.env.MINIO_BUCKET || 'ocorrencias';
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: String(process.env.MINIO_USE_SSL || 'false') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'admin12345',
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

const isHeicHeif = (file) => {
  const mime = String(file?.mimetype || '').toLowerCase();
  const name = String(file?.originalname || '').toLowerCase();
  return mime === 'image/heic' ||
    mime === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif');
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

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const forceJpg = isHeicHeif(file) ? '.jpg' : null;
    cb(null, gerarNomeArquivo(file.originalname, forceJpg));
  },
});

const storage = storageDriver === 'minio'
  ? multer.memoryStorage()
  : localStorage;

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();

  const ok = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ].includes(mime) || /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(name);

  ok ? cb(null, true) : cb(new Error('Apenas imagens são permitidas'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadParaCloudinary = async (fileOrPath) => {
  if (!fileOrPath) return { url: null, public_id: null, mime_type: null };

  if (storageDriver === 'minio') {
    await garantirBucket();

    const normalized = await normalizarImagem(fileOrPath);
    const filename = gerarNomeArquivo(normalized.originalname, normalized.ext);

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

  const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
  const filename = path.basename(filePath);

  return {
    url: `/uploads/${filename}`,
    public_id: filename,
    mime_type: fileOrPath.mimetype || null,
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
  uploadParaCloudinary,
  removerDoCloudinary,
  servirArquivo,
};
