const Report = require('../models/Report');
const { uploadParaCloudinary, removerDoCloudinary } = require('../services/uploadService');
const { filtrarPorProximidade } = require('../services/mapService');
const { createError } = require('../middlewares/errorMiddleware');

const toPlain = (r) => r && r.toJSON ? r.toJSON() : r;

// POST /reports
const createReport = async (req, res, next) => {
  try {
    const { titulo, descricao, categoria, latitude, longitude, anonimo } = req.body;
    if (!titulo || !categoria || latitude === undefined || longitude === undefined) {
      throw createError('Título, categoria, latitude e longitude são obrigatórios', 400);
    }

    let imagem_url = null;
    let imagem_public_id = null;
    let mime_type = null;

    if (req.file) {
      const uploaded = await uploadParaCloudinary(req.file);
      imagem_url = uploaded.url;
      imagem_public_id = uploaded.public_id;
      mime_type = uploaded.mime_type || req.file.mimetype;
    }

    const report = await Report.create({
      titulo,
      descricao,
      categoria,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      imagem_url,
      imagem_public_id,
      mime_type,
      status: 'pendente',
      user_id: req.user.id,
      anonimo: anonimo === 'true' || anonimo === true,
    });

    const full = await Report.findByPk(report.id, { include: true });
    return res.status(201).json({
      status: 'sucesso',
      mensagem: 'Denúncia criada',
      data: { report: toPlain(full) },
    });
  } catch (err) { next(err); }
};

// GET /reports
const getAllReports = async (req, res, next) => {
  try {
    const { status, categoria, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (categoria) where.categoria = categoria;

    if (req.user.role !== 'admin') where.user_id = req.user.id;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (safePage - 1) * safeLimit;

    const { count, rows } = await Report.findAndCountAll({
      where,
      include: true,
      order: [['criado_em', 'DESC']],
      limit: safeLimit,
      offset,
    });

    return res.status(200).json({
      status: 'sucesso',
      data: {
        reports: rows.map(toPlain),
        paginacao: {
          total: count,
          pagina: safePage,
          limite: safeLimit,
          paginas: Math.ceil(count / safeLimit),
        },
      },
    });
  } catch (err) { next(err); }
};

// GET /reports/nearby
const getReportsByLocation = async (req, res, next) => {
  try {
    const { lat, lng, raio = 5 } = req.query;
    if (!lat || !lng) throw createError('Parâmetros lat e lng são obrigatórios', 400);

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const raioKm = parseFloat(raio);

    const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };
    const reports = await Report.findAll({ where, include: true });
    const filtrados = filtrarPorProximidade(reports.map(toPlain), latitude, longitude, raioKm);

    return res.status(200).json({
      status: 'sucesso',
      data: {
        reports: filtrados,
        total: filtrados.length,
        raio_km: raioKm,
        centro: { latitude, longitude },
      },
    });
  } catch (err) { next(err); }
};

// PATCH /reports/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validos = ['pendente', 'em_analise', 'em_andamento', 'resolvido', 'rejeitado'];

    if (!status || !validos.includes(status)) {
      throw createError(`Status inválido. Aceitos: ${validos.join(', ')}`, 400);
    }

    const report = await Report.findByPk(id);
    if (!report) throw createError('Denúncia não encontrada', 404);

    await report.update({ status });

    const full = await Report.findByPk(id, { include: true });
    return res.status(200).json({
      status: 'sucesso',
      mensagem: 'Status atualizado',
      data: { report: toPlain(full) },
    });
  } catch (err) { next(err); }
};

// DELETE /reports/:id
const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    if (!report) throw createError('Denúncia não encontrada', 404);

    if (report.user_id !== req.user.id && req.user.role !== 'admin') {
      throw createError('Sem permissão para deletar esta denúncia', 403);
    }

    if (report.imagem_public_id) await removerDoCloudinary(report.imagem_public_id);
    await report.destroy();

    return res.status(200).json({ status: 'sucesso', mensagem: 'Denúncia removida' });
  } catch (err) { next(err); }
};

module.exports = { createReport, getAllReports, getReportsByLocation, updateStatus, deleteReport };
