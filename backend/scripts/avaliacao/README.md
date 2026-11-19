# Avaliação do prompt de análise de imagens

Roda o prompt de produção (`src/services/ai`) sobre 40 imagens com gabarito e gera um relatório de acertos e falhas.
Cada imagem é analisada uma única vez por versão do prompt, para economizar a cota gratuita do Gemini.

## Conjunto de imagens

O `manifesto.json` lista as 40 imagens, com origem, licença, autor, SHA-256 e gabarito:

- 34 fotos públicas: [QR4Change](https://data.mendeley.com/datasets/zndzygc3p3/2) (CC BY 4.0) e Wikimedia Commons (licença por arquivo).
- 6 casos de borda gerados a partir delas: noite, borrada, baixa resolução, texto com instrução falsa e documento.

As imagens não vão para o repositório. Para baixá-las e validá-las:

```bash
cd backend
node scripts/avaliacao/montarDataset.js
```

O script aceita só HTTPS dos hosts previstos, confere o tipo e o SHA-256 de cada arquivo e recodifica tudo com o `sharp`, sem metadados.
Os originais ficam em `dados/brutos/*.bin` e as imagens usadas em `dados/imagens/`.

Use só imagens públicas aqui: no plano gratuito, o Google pode usar o conteúdo enviado para melhorar seus produtos.

## Rodando a avaliação

A chave vem de `GEMINI_API_KEY`, no ambiente ou em `backend/.env`. No PowerShell:

```powershell
$env:GEMINI_API_KEY = "sua-chave"
node scripts/avaliacao/avaliarPrompt.js
```

- Os resultados ficam em `dados/resultados/<versão>/`, com um JSON por imagem e o `relatorio.md`.
- A versão é um hash do prompt, do schema e do modelo. Ao mudar qualquer um deles, as imagens são analisadas de novo numa pasta nova.
- Ao atingir o limite por minuto, o script espera e tenta de novo. Se a cota diária acabar, ele para e informa quantas imagens faltam: troque a chave e rode o mesmo comando.
- `AVALIACAO_PAUSA_MS` define a pausa entre chamadas. O padrão é 13000 ms, cerca de 4 por minuto.

Opções:

| Opção | Efeito |
|---|---|
| `--relatorio` | Só gera o relatório com o que já foi analisado, sem chamar a API |
| `--refazer-erros` | Analisa de novo os casos que tiveram erro técnico (timeout, rede, servidor) |

Respostas fora do formato não são refeitas, porque contam como falha do prompt.
