const VEREDITO_DO_RESULTADO = {
  aprovada: 'valida',
  bloqueada_fora_escopo: 'fora_do_escopo',
  bloqueada_impropria: 'impropria',
};
const COLUNAS = ['valida', 'fora_do_escopo', 'impropria', 'formato_invalido', 'erro_tecnico', 'pendente'];
const PLACA = /\b[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}\b|\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/;

const pct = (parte, total) => (total ? `${Math.round((parte / total) * 100)}%` : '-');
const media = (valores) => (valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : '-');
const grupoDe = (id) => id.replace(/-\d+$/, '');
const curto = (texto = '', limite = 140) => String(texto).replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, limite);

const obtido = (r) => {
  if (!r) return 'pendente';
  return r.situacao === 'ok' ? VEREDITO_DO_RESULTADO[r.resultado] : r.situacao;
};

const tabela = (cabecalho, linhas) =>
  [`| ${cabecalho.join(' | ')} |`, `|${cabecalho.map(() => '---').join('|')}|`, ...linhas.map((l) => `| ${l.join(' | ')} |`)].join('\n');

function gerarRelatorio({ casos, resultados, versao, modelo }) {
  const linhas = casos.map((caso) => ({ caso, r: resultados[caso.id], obtido: obtido(resultados[caso.id]) }));
  const analisados = linhas.filter((l) => l.r);
  const respondidos = analisados.filter((l) => l.r.situacao === 'ok');
  const acertos = analisados.filter((l) => l.obtido === l.caso.gabarito.veredito);

  const matriz = ['valida', 'fora_do_escopo'].map((esperado) => [
    `**${esperado}**`,
    ...COLUNAS.map((col) => linhas.filter((l) => l.caso.gabarito.veredito === esperado && l.obtido === col).length),
  ]);

  const validasAprovadas = respondidos.filter((l) => l.caso.gabarito.veredito === 'valida' && l.obtido === 'valida');
  const categoriaOk = validasAprovadas.filter((l) => l.caso.gabarito.categoria.includes(l.r.sugestoes.categoria));
  const orgaoOk = validasAprovadas.filter((l) => l.caso.gabarito.orgao === l.r.sugestoes.orgao);

  const prioridades = {};
  validasAprovadas.forEach((l) => { prioridades[l.r.sugestoes.prioridade] = (prioridades[l.r.sugestoes.prioridade] || 0) + 1; });

  const grupos = [...new Set(casos.map((c) => grupoDe(c.id)))].map((g) => {
    const doGrupo = analisados.filter((l) => grupoDe(l.caso.id) === g);
    return [g, doGrupo.length, `${doGrupo.filter((l) => l.obtido === l.caso.gabarito.veredito).length}/${doGrupo.length}`];
  });

  const divergencias = analisados
    .filter((l) => l.obtido !== l.caso.gabarito.veredito
      || (l.obtido === 'valida' && !l.caso.gabarito.categoria.includes(l.r.sugestoes.categoria))
      || (l.obtido === 'valida' && l.caso.gabarito.orgao !== l.r.sugestoes.orgao))
    .map((l) => [
      l.caso.id,
      [l.caso.gabarito.veredito, l.caso.gabarito.categoria?.join('/'), l.caso.gabarito.orgao].filter(Boolean).join(' · '),
      [l.obtido, l.r.sugestoes?.categoria, l.r.sugestoes?.orgao].filter(Boolean).join(' · '),
      curto(l.r.motivo || l.r.erro),
    ]);

  const placas = respondidos
    .filter((l) => PLACA.test([l.r.motivo, l.r.sugestoes?.titulo, l.r.sugestoes?.descricao].join(' ')))
    .map((l) => l.caso.id);

  const usos = respondidos.map((l) => l.r.resposta?.uso).filter(Boolean);

  return `# Avaliação do prompt — versão ${versao}

Modelo: \`${modelo}\` · Analisados: ${analisados.length}/${casos.length} · Pendentes: ${casos.length - analisados.length}

## Resumo
| Métrica | Valor |
|---|---|
| Acerto do veredito | ${acertos.length}/${analisados.length} (${pct(acertos.length, analisados.length)}) |
| Acerto da categoria (válidas aprovadas) | ${categoriaOk.length}/${validasAprovadas.length} (${pct(categoriaOk.length, validasAprovadas.length)}) |
| Acerto do órgão (válidas aprovadas) | ${orgaoOk.length}/${validasAprovadas.length} (${pct(orgaoOk.length, validasAprovadas.length)}) |
| Resposta fora do formato | ${analisados.filter((l) => l.obtido === 'formato_invalido').length} |
| Erro técnico (timeout, rede, servidor) | ${analisados.filter((l) => l.obtido === 'erro_tecnico').length} |
| Tempo médio / máximo | ${media(analisados.map((l) => l.r.tempo_ms))} ms / ${Math.max(0, ...analisados.map((l) => l.r.tempo_ms))} ms |
| Tokens médios (entrada / saída) | ${media(usos.map((u) => u.promptTokenCount || 0))} / ${media(usos.map((u) => u.candidatesTokenCount || 0))} |
| Possível placa citada | ${placas.length ? placas.join(', ') : 'nenhuma'} |

## Matriz de confusão (esperado × obtido)
${tabela(['esperado', ...COLUNAS], matriz)}

## Por grupo
${tabela(['grupo', 'analisados', 'acerto do veredito'], grupos)}

## Prioridade sugerida (válidas aprovadas)
${tabela(['prioridade', 'qtd'], Object.entries(prioridades))}

## Divergências
${divergencias.length ? tabela(['caso', 'esperado', 'obtido', 'motivo do modelo / erro'], divergencias) : 'Nenhuma.'}
`;
}

module.exports = { gerarRelatorio };
