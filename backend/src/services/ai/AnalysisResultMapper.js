const { CATEGORIAS, PRIORIDADES, VEREDITOS, ORGAOS } = require('./analysisPrompt');

const MENSAGENS = {
  bloqueada_impropria: 'Esta imagem contém conteúdo impróprio e não pode ser enviada. Remova-a ou escolha outra foto.',
  bloqueada_fora_escopo: 'Esta imagem não parece mostrar um problema de infraestrutura urbana. Remova-a ou escolha outra foto.',
  aprovada: 'Imagem analisada. Revise as sugestões antes de enviar.',
  aprovada_com_censura: 'Imagem analisada. Rostos e dados pessoais serão borrados no envio. Revise as sugestões.',
  indisponivel: 'A análise automática está indisponível. Você pode continuar e preencher os campos manualmente.',
  indisponivel_sem_envio: 'A análise automática está indisponível. Tente novamente ou remova a foto para continuar sem ela.',
};

const textoLimpo = (valor, limite) => (typeof valor === 'string' ? valor.trim().slice(0, limite) : '');

const valorPermitido = (valor, permitidos, padrao) => (permitidos.includes(valor) ? valor : padrao);

const caixaValida = (box) =>
  Array.isArray(box) &&
  box.length === 4 &&
  box.every((v) => Number.isFinite(v) && v >= 0 && v <= 1000) &&
  box[0] < box[2] &&
  box[1] < box[3];

// Retorna só as caixas [ymin, xmin, ymax, xmax] válidas.
const extrairAreas = (areas) => (Array.isArray(areas) ? areas.map((a) => a?.box_2d).filter(caixaValida) : []);

const areasDoLog = (log) => {
  const resposta = typeof log?.resposta_json === 'string' ? JSON.parse(log.resposta_json) : log?.resposta_json;
  return extrairAreas(resposta?.dados?.areas_sensiveis);
};

// A saída da IA é tratada como dado externo: nada chega ao usuário sem validação.
const mapear = ({ bloqueioSeguranca, motivoSeguranca, dados }) => {
  if (bloqueioSeguranca) {
    return {
      resultado: 'bloqueada_impropria',
      motivo: `Bloqueio de segurança do modelo: ${motivoSeguranca}`,
      mensagem: MENSAGENS.bloqueada_impropria,
      sugestoes: null,
    };
  }

  if (!dados || !VEREDITOS.includes(dados.veredito)) {
    throw new Error('Resposta da IA fora do formato esperado');
  }

  const motivo = textoLimpo(dados.motivo, 500);

  if (dados.veredito === 'impropria') {
    return { resultado: 'bloqueada_impropria', motivo, mensagem: MENSAGENS.bloqueada_impropria, sugestoes: null };
  }

  if (dados.veredito === 'fora_do_escopo') {
    return { resultado: 'bloqueada_fora_escopo', motivo, mensagem: MENSAGENS.bloqueada_fora_escopo, sugestoes: null };
  }

  return {
    resultado: 'aprovada',
    motivo,
    mensagem: extrairAreas(dados.areas_sensiveis).length ? MENSAGENS.aprovada_com_censura : MENSAGENS.aprovada,
    sugestoes: {
      categoria: valorPermitido(dados.categoria, CATEGORIAS, 'outro'),
      titulo: textoLimpo(dados.titulo, 150),
      descricao: textoLimpo(dados.descricao, 1000),
      prioridade: valorPermitido(dados.prioridade, PRIORIDADES, 'media'),
      orgao: valorPermitido(dados.orgao, Object.keys(ORGAOS), 'PREFEITURA'),
    },
  };
};

module.exports = { mapear, extrairAreas, areasDoLog, MENSAGENS };
