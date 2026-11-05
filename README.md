# VidEita — Sistema de Ocorrências Urbanas

Plataforma web para cidadãos de Videira (SC) registrarem ocorrências urbanas (buracos, lixo,
iluminação etc.) em um mapa e acompanharem o atendimento pela prefeitura.

**Stack:** React + Vite + Leaflet · Node.js + Express · MySQL 8.4 · MinIO · Nginx · Docker Compose

> ⚠️ **Projeto acadêmico.** As credenciais exibidas neste documento são **dados de
> demonstração**, definidos como padrão para facilitar apresentações em sala e a avaliação.
> **Não são segredos reais** e **não devem ser usadas em ambiente exposto na internet**.
> Veja a seção [Credenciais de demonstração](#credenciais-de-demonstração) e a seção
> [Segurança](#segurança).

---

## Sumário

1. [Início rápido](#início-rápido)
2. [Credenciais de demonstração](#credenciais-de-demonstração)
3. [Configuração (.env)](#configuração-env)
4. [Endereços e portas](#endereços-e-portas)
5. [Comandos úteis](#comandos-úteis)
6. [Armazenamento de imagens](#armazenamento-de-imagens)
7. [Login com Google (opcional)](#login-com-google-opcional)
8. [Acesso pelo celular com ngrok (opcional)](#acesso-pelo-celular-com-ngrok-opcional)
9. [Desenvolvimento fora do Docker](#desenvolvimento-fora-do-docker)
10. [Segurança](#segurança)

---

## Início rápido

Requisito: Docker com Docker Compose.

```bash
docker compose up --build -d
```

Não é preciso criar nenhum arquivo de configuração: sem `.env`, o projeto sobe com os
padrões de demonstração. Confira se os serviços subiram:

```bash
docker compose ps
```

Devem aparecer `mysql`, `minio`, `backend`, `nginx` e `adminer` como `Up`. Depois acesse
**http://localhost:8080** e entre com o administrador de demonstração (abaixo).

> O banco começa **vazio**, apenas com categorias, status e órgãos públicos. Crie uma conta
> pela tela de cadastro ou entre como administrador para registrar ocorrências.

---

## Credenciais de demonstração

Valem **somente quando não existe um `.env` na raiz** (são os valores padrão do
`docker-compose.yml`). Se você definir qualquer variável no `.env`, ela substitui o padrão.

| Serviço | Onde acessar | Usuário | Senha (demo) |
|---|---|---|---|
| Sistema (administrador) | http://localhost:8080/entrar | `admin@prefeitura.gov.br` | `123456` |
| MySQL / Adminer | http://localhost:8081 (servidor `mysql`, banco `base_projeto_integrador`) | `admin` | `admin123` |
| MinIO (console) | http://localhost:9001 (bucket `ocorrencias`) | `admin` | `admin12345` |

Observações:

- O administrador é **recriado a cada inicialização do backend**, e a senha dele é sempre
  a de `SEED_ADMIN_PASSWORD`. Alterar a senha pela interface não persiste após reiniciar.
- Estas senhas são fracas **de propósito** (uso em sala de aula/avaliação). Para qualquer uso
  fora disso, defina valores próprios no `.env`, como descrito a seguir.

---

## Configuração (.env)

Para trocar qualquer padrão, copie o modelo e preencha somente o que quiser alterar:

```bash
cp .env.example .env
docker compose up --build -d
```

| Variável | Para que serve | Padrão |
|---|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Banco de dados da aplicação | valores de demonstração |
| `MYSQL_ROOT_PASSWORD` | Senha do root do MySQL | valor de demonstração |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Credenciais do MinIO | valores de demonstração |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Administrador do sistema | valores de demonstração |
| `JWT_SECRET` | Assinatura dos tokens de login | **vazio**: o backend gera um segredo aleatório a cada início (as sessões caem ao reiniciar) |
| `JWT_EXPIRES_IN` | Validade do token | `7d` |
| `CORS_ORIGIN` | Origens permitidas na API | `*` |
| `VITE_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` | Login com Google | vazio (botão oculto) |

Para gerar um `JWT_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `.env` está no `.gitignore` e **nunca deve ser commitado**. Só os modelos
`*.example` ficam no repositório.

> Se você já subiu o projeto antes e mudou `DB_PASSWORD`, `DB_USER` ou `MYSQL_ROOT_PASSWORD`,
> o MySQL manterá as credenciais antigas gravadas no volume. Para aplicar as novas, recrie
> o volume com `docker compose down -v` (isso apaga os dados).

---

## Endereços e portas

| Serviço | Endereço | Observação |
|---|---|---|
| Site | http://localhost:8080 | Única porta aberta para a rede |
| API (Swagger) | http://localhost:8080/api-docs | |
| API direta | http://localhost:3000 | Somente `127.0.0.1` |
| Adminer | http://localhost:8081 | Somente `127.0.0.1` |
| MySQL | `localhost:3307` | Somente `127.0.0.1` (para MySQL Workbench) |
| MinIO (S3 / console) | `localhost:9000` / http://localhost:9001 | Somente `127.0.0.1` |

Dentro da rede do Docker, o backend usa `mysql:3306` e `minio:9000`.

---

## Comandos úteis

```bash
docker compose logs -f              # logs de tudo
docker compose logs -f backend      # logs de um serviço (mysql, minio, nginx...)
docker compose up --build -d        # recompilar e subir (necessário após alterar frontend/ ou backend/)
docker compose up --build --force-recreate -d   # recriar os containers
docker compose down                 # parar
docker compose down -v              # parar e APAGAR os volumes do MySQL e do MinIO
```

Entrar no MySQL pelo terminal (usa as credenciais já definidas no container, sem digitar senha):

```bash
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Consultas de exemplo:

```sql
SHOW TABLES;
SELECT * FROM reports ORDER BY criado_em DESC;
SELECT * FROM report_attachments ORDER BY criado_em DESC;
```

> `down -v` apaga o banco e as imagens. Use apenas quando quiser recomeçar do zero.

---

## Armazenamento de imagens

O sistema aceita imagens JPEG, PNG, WebP, GIF, HEIC e HEIF de até 15 MB. Arquivos HEIC/HEIF
enviados por celular são convertidos para JPG antes de serem salvos no MinIO.

O banco guarda apenas o caminho da imagem (por exemplo, `/files/report-123456789.png`), e o
navegador a acessa pelo Nginx em `http://localhost:8080/files/<nome-do-arquivo>`. O
navegador nunca fala direto com o MinIO.

---

## Login com Google (opcional)

O botão do Google só aparece quando `VITE_GOOGLE_CLIENT_ID` está definido.

1. No Google Cloud Console, crie um **OAuth Client ID** do tipo **Web application**.
2. Em **Authorized JavaScript origins**, adicione os endereços do frontend:

   ```text
   http://localhost:8080
   https://SEU-LINK.ngrok-free.dev
   ```

3. Copie o **Client ID** e coloque no `.env` da raiz:

   ```env
   VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
   ```

   O backend herda esse mesmo valor em `GOOGLE_CLIENT_ID`; só defina os dois separadamente
   se precisarem ser diferentes.

4. Recrie o frontend e o backend:

   ```bash
   docker compose up --build -d
   ```

O Client ID **não é um segredo** (ele aparece no código do navegador), mas ele identifica o
seu projeto no Google Cloud. Nunca coloque aqui o *client secret* (`GOCSPX-...`): este fluxo
não usa.

---

## Acesso pelo celular com ngrok (opcional)

Usado para expor o site por HTTPS, requisito para a geolocalização funcionar no celular.

1. Crie uma conta em https://dashboard.ngrok.com e copie seu *authtoken*.
2. Suba o projeto e confirme que `http://localhost:8080` abre.
3. Abra o túnel de uma das formas:

   **Pela CLI do ngrok:**

   ```bash
   ngrok config add-authtoken SEU_TOKEN_AQUI
   ngrok http 8080
   ```

   **Pelo Node** (lê o token de `.env.ngrok`, que é ignorado pelo git):

   ```bash
   cp .env.ngrok.example .env.ngrok     # depois cole seu token em NGROK_AUTHTOKEN
   npm install
   node ngrok.js
   ```

4. Abra no celular o link `https://...ngrok-free.dev` exibido e permita o acesso à
   localização quando o navegador pedir.

Regras importantes:

- Exponha **somente** a porta `8080`. Nunca exponha Adminer, MySQL, MinIO ou o backend direto.
- Seu *authtoken* é pessoal: não o escreva no README, em código ou em commits. Se ele vazar,
  revogue-o no painel do ngrok.
- Enquanto o túnel estiver aberto, o site fica público e com as **credenciais de demonstração**.
  Defina senhas próprias no `.env` antes de expor.
- No plano gratuito, o ngrok mostra uma tela de aviso antes de abrir o site; isso é normal.

---

## Desenvolvimento fora do Docker

Com `mysql` e `minio` rodando no compose:

```bash
cd backend
cp .env.example .env     # preencha DB_PASSWORD e SEED_ADMIN_PASSWORD (use os mesmos do compose)
npm install
npm run dev              # API em http://localhost:3000
```

```bash
cd frontend
npm install
npm run dev              # Vite em http://localhost:5173 (o proxy /api aponta para :3000)
```

Notas:

- O MySQL do compose é publicado na porta **3307** (já configurada em `backend/.env.example`).
- Para usar o MinIO no backend local, defina `STORAGE_DRIVER=minio`, `MINIO_ENDPOINT=localhost`
  e as chaves do MinIO. Com `STORAGE_DRIVER=local`, as imagens vão para `UPLOAD_DIR`.
- O proxy do Vite cobre apenas `/api`, então as imagens (`/files`, `/uploads`) não carregam
  na porta 5173; use a porta 8080 para ver o sistema completo.
- Alterações em `frontend/` ou `backend/` só aparecem no Docker após `docker compose up --build -d`.

---

## Segurança

- **Credenciais de demonstração:** servem apenas para uso local, em sala de aula e na avaliação.
  Antes de expor o sistema (ngrok, servidor, nuvem), defina valores próprios no `.env`.
- **Arquivos que nunca devem ir para o git:** `.env`, `.env.*` (exceto os `*.example`),
  `.env.ngrok`, chaves e certificados. Todos já estão no `.gitignore`.
- **`JWT_SECRET`:** em qualquer ambiente que não seja uma demonstração rápida, defina um valor
  longo e aleatório.
- **Portas internas:** MySQL, MinIO, Adminer e API só escutam em `127.0.0.1`. Mantenha assim.
- **Se um segredo vazar:** revogue-o no serviço de origem (ngrok, Google, banco) antes de
  qualquer outra coisa. Apagar o arquivo ou reescrever o histórico do git não invalida o
  valor que já foi exposto.
