const { CATEGORIAS, PRIORIDADES, VEREDITOS, ORGAOS } = require('./analysisPrompt');

const MENSAGENS = {
  bloqueada_impropria: 'Esta imagem contém conteúdo impróprio e não pode ser enviada. Remova-a ou escolha outra foto.',
  bloqueada_fora_escopo: 'Esta imagem não parece mostrar um problema de infraestrutura urbana. Remova-a ou escolha outra foto.',
  aprovada: 'Imagem analisada. Revise as sugestões antes de enviar.',
  indisponivel: 'A análise automática está indisponível. Você pode continuar e preencher os campos manualmente.',
};

const textoLimpo = (valor, limite) => (typeof valor === 'string' ? valor.trim().slice(0, limite) : '');

const valorPermitido = (valor, permitidos, padrao) => (permitidos.includes(valor) ? valor : padrao);

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
    mensagem: MENSAGENS.aprovada,
    sugestoes: {
      categoria: valorPermitido(dados.categoria, CATEGORIAS, 'outro'),
      titulo: textoLimpo(dados.titulo, 150),
      descricao: textoLimpo(dados.descricao, 1000),
      prioridade: valorPermitido(dados.prioridade, PRIORIDADES, 'media'),
      orgao: valorPermitido(dados.orgao, Object.keys(ORGAOS), 'PREFEITURA'),
    },
  };
};

module.exports = { mapear, MENSAGENS };
