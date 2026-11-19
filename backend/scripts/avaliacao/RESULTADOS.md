# Resultados da avaliação do prompt

Testes feitos em 18 e 19/11/2026 com chaves do plano gratuito.

## Resumo

- Sempre que o modelo respondeu, a resposta estava certa: veredito, categoria, órgão e casos de borda, inclusive a imagem com instrução falsa.
- O problema encontrado foi de tempo de resposta. O `gemini-3.6-flash` no plano gratuito ficou instável, com respostas acima de 40 s e erros 503 por alta demanda.
- A lentidão não vem do prompt, do nível de pensamento, da resolução da imagem nem da rede local.
- Por ora a aplicação continua com o `gemini-3.6-flash`. A estabilidade será testada de novo em outros dias e horários.

## Execuções

| Versão | Quando | Modelo e configuração | Casos | Resultado |
|---|---|---|---|---|
| `14ac8d39613a` | 18/11, 21h30–22h50 | 3.6-flash, pensamento e resolução padrão | 40 | 28 responderam, todos certos (mediana de 5,6 s). 12 passaram de 40 s |
| `878965d37845` | 19/11, ~10h | 3.6-flash, prompt com censura, pensamento e resolução médios | 12 que falharam | Limite de 40 s: 2 responderam (32 e 38 s). Limite de 90 s: mais 4 (34–76 s), 5 passaram de 90 s, 1 deu 503 |
| `8720afff324d` | 19/11, ~10h30 | 3.5-flash-lite, mesma configuração, limite de 50 s | 6 que ainda falhavam | Todos responderam em 3–18 s (média de 12 s), todos certos |

Horários de Brasília.

## Instabilidade do gemini-3.6-flash gratuito

- As mesmas fotos falharam nas duas versões, mas o tempo varia com a carga do servidor: na aplicação, as análises de 06/11 (à noite) levaram 4–13 s, e as de 19/11 (de manhã), 20–32 s, uma delas com timeout.
- O AI Studio registrou erros 503 ("model is currently experiencing high demand") e um 429: 3 erros em 18/11 e 7 em 19/11.
- A página de status do Gemini não mostra nada, porque registra quedas, não lentidão.
- Os timeouts não aparecem no AI Studio, porque é a aplicação que cancela a chamada.
- O tempo não acompanha os tokens de pensamento: um caso de 38 s usou só 298 tokens. A maior parte da espera é fila no servidor.
- Reduzir o pensamento e a resolução para médio não diminuiu o tempo e não piorou os acertos.

Com o limite atual de 40 s, nos horários de pico muitas fotos caem em "análise indisponível". Um limite de 50 s cobriria todas as análises da aplicação em 19/11 e 5 dos 12 casos mais lentos.

## Trocar para o modelo lite

Ganhos:
- Menos disputa: o modelo respondeu sem 503 nem timeout no mesmo horário em que o 3.6-flash falhava.
- Mais rápido: 3–18 s contra 32–90+ s nas mesmas fotos.
- Mesma precisão na classificação: 6/6 vereditos e 4/4 categorias e órgãos.

Prejuízo:
- No `lixo-07`, a caixa da placa veio um pouco acima da posição real. Mesmo com a margem de 15% da censura, a metade de baixo da placa continua legível depois da pixelização.
- Foi um caso só, e o 3.6-flash não respondeu essa foto, então não dá para comparar a precisão das caixas entre os dois modelos.

## Pendências

- Testar o 3.6-flash em outros dias e horários com `--erros-da-versao 878965d37845 --refazer-erros`.
- Decidir o limite da aplicação (40 ou 50 s, via `GEMINI_TIMEOUT_MS`).
- Avaliar se a margem da censura precisa ser maior para placas, que são caixas baixas e estreitas.
