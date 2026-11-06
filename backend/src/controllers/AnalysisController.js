const ImageAnalysisService = require('../services/ai/ImageAnalysisService');
const { createError } = require('../middlewares/errorMiddleware');

const imageAnalysisService = new ImageAnalysisService();

// POST /reports/analise
const analisarImagem = async (req, res, next) => {
  try {
    if (!req.file) throw createError('Envie uma imagem para análise', 400);

    const analise = await imageAnalysisService.analisar(req.file, req.user.id);
    return res.status(200).json({ status: 'sucesso', data: analise });
  } catch (err) { next(err); }
};

module.exports = { analisarImagem, imageAnalysisService };
