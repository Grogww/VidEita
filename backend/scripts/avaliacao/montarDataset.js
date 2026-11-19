const fs = require('fs/promises');
const path = require('path');
const { createHash } = require('crypto');
const sharp = require('sharp');

const RAIZ = __dirname;
const MANIFESTO = path.join(RAIZ, 'manifesto.json');
const BRUTOS = path.join(RAIZ, 'dados', 'brutos');
const IMAGENS = path.join(RAIZ, 'dados', 'imagens');

const HOSTS_PERMITIDOS = ['data.mendeley.com', 'upload.wikimedia.org', 'thumb.wikimedia.org'];
// Evita o limite de requisições do Wikimedia.
const PAUSA_ENTRE_DOWNLOADS_MS = 2000;
const TAMANHO_MAXIMO = 25 * 1024 * 1024;
const LADO_MAXIMO = 1536;

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const existe = (arquivo) => fs.access(arquivo).then(() => true, () => false);

const ehJpegOuPng = (b) =>
  (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
  b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

async function baixar(url) {
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'https:' || !HOSTS_PERMITIDOS.includes(hostname)) {
    throw new Error(`origem não permitida: ${url}`);
  }

  const resposta = await fetch(url, { headers: { 'User-Agent': 'videita-avaliacao/1.0' } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  if (!resposta.url.startsWith('https://')) throw new Error('redirecionamento sem HTTPS');
  if (Number(resposta.headers.get('content-length')) > TAMANHO_MAXIMO) throw new Error('arquivo grande demais');

  const partes = [];
  let total = 0;
  for await (const parte of resposta.body) {
    total += parte.length;
    if (total > TAMANHO_MAXIMO) throw new Error('arquivo grande demais');
    partes.push(parte);
  }
  return Buffer.concat(partes);
}

// O bruto fica isolado com extensão .bin; só a versão recodificada pelo sharp é usada.
async function obterBruto(item) {
  const destino = path.join(BRUTOS, `${item.id}.bin`);
  const local = await existe(destino);
  const buffer = local ? await fs.readFile(destino) : await baixar(item.url);
  if (!local) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_DOWNLOADS_MS));

  if (!ehJpegOuPng(buffer)) throw new Error('conteúdo não é JPEG nem PNG');

  const hash = sha256(buffer);
  if (item.sha256 && item.sha256 !== hash) throw new Error('SHA-256 diferente do manifesto');
  item.sha256 = hash;

  if (!local) await fs.writeFile(destino, buffer);
  return buffer;
}

const sanitizar = (entrada) =>
  sharp(entrada)
    .rotate()
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 });

const escaparXml = (texto) => texto.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

const blocoDeTexto = (largura, altura, linhas, { fundo = 'none', cor = '#111', tamanho = 40 } = {}) => {
  const texto = linhas
    .map((l, i) => `<text x="40" y="${80 + i * tamanho * 1.5}" font-family="Arial" font-size="${tamanho}" fill="${cor}">${escaparXml(l)}</text>`)
    .join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><rect width="100%" height="100%" fill="${fundo}"/>${texto}</svg>`);
};

const TRANSFORMACOES = {
  noite: (img) => img.modulate({ brightness: 0.25 }).linear(1.1, -8),
  borrada: (img) => img.blur(12),
  baixa_resolucao: async (img) => sharp(await img.resize(160).toBuffer()).resize(1024, null, { kernel: 'nearest' }),
  injecao: async (img, { texto }) => {
    const { width, height } = await sharp(await img.toBuffer()).metadata();
    const faixa = blocoDeTexto(width, Math.round(height * 0.35), texto, { fundo: 'rgba(255,255,255,0.85)', tamanho: Math.round(width / 32) });
    return img.composite([{ input: faixa, gravity: 'south' }]);
  },
  documento: (_, { texto }) => sharp(blocoDeTexto(1240, 1754, texto, { fundo: '#fff', tamanho: 34 })),
};

async function gerarDerivada(item) {
  const base = item.base ? sharp(path.join(IMAGENS, `${item.base}.jpg`)) : null;
  const imagem = await TRANSFORMACOES[item.transformacao](base, item);
  await imagem.jpeg({ quality: 90 }).toFile(path.join(IMAGENS, `${item.id}.jpg`));
}

async function main() {
  const manifesto = JSON.parse(await fs.readFile(MANIFESTO, 'utf8'));
  await fs.mkdir(BRUTOS, { recursive: true });
  await fs.mkdir(IMAGENS, { recursive: true });

  const falhas = [];
  for (const item of manifesto.imagens) {
    const saida = path.join(IMAGENS, `${item.id}.jpg`);
    try {
      const bruto = await obterBruto(item);
      if (!(await existe(saida))) await sanitizar(bruto).toFile(saida);
    } catch (err) {
      falhas.push(`${item.id}: ${err.message}`);
    }
  }

  for (const item of manifesto.derivadas) {
    if (await existe(path.join(IMAGENS, `${item.id}.jpg`))) continue;
    try {
      await gerarDerivada(item);
    } catch (err) {
      falhas.push(`${item.id}: ${err.message}`);
    }
  }

  await fs.writeFile(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`);

  const total = manifesto.imagens.length + manifesto.derivadas.length;
  console.log(`${total - falhas.length}/${total} imagens prontas em ${path.relative(process.cwd(), IMAGENS)}`);
  falhas.forEach((f) => console.error(`  falhou ${f}`));
  if (falhas.length) process.exitCode = 1;
}

main();
