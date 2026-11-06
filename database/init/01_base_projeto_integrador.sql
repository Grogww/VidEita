CREATE DATABASE IF NOT EXISTS base_projeto_integrador
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE base_projeto_integrador;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Remove tabelas da modelagem antiga e da nova, para permitir importação limpa.
DROP TABLE IF EXISTS report_encaminhamentos;
DROP TABLE IF EXISTS report_status_history;
DROP TABLE IF EXISTS report_attachments;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS orgaos_publicos;
DROP TABLE IF EXISTS report_statuses;
DROP TABLE IF EXISTS report_categories;
DROP TABLE IF EXISTS users;

DROP TABLE IF EXISTS anexos;
DROP TABLE IF EXISTS bairros;
DROP TABLE IF EXISTS cat_problema;
DROP TABLE IF EXISTS encaminhamento;
DROP TABLE IF EXISTS faz;
DROP TABLE IF EXISTS funcionarios;
DROP TABLE IF EXISTS localizacao;
DROP TABLE IF EXISTS orgao_publico;
DROP TABLE IF EXISTS ocorrencia;
DROP TABLE IF EXISTS respostas_status;
DROP TABLE IF EXISTS cidadao;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  google_id VARCHAR(255) NULL,
  senha VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  telefone VARCHAR(30) NULL,
  bairro VARCHAR(100) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_google_id (google_id),
  KEY idx_users_role (role),
  KEY idx_users_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_categories (
  codigo VARCHAR(30) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  emoji VARCHAR(8) NULL,
  descricao VARCHAR(255) NULL,
  area_responsavel VARCHAR(120) NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (codigo),
  UNIQUE KEY uk_report_categories_nome (nome),
  KEY idx_report_categories_ativo_ordem (ativo, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_statuses (
  codigo VARCHAR(30) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  visivel_cidadao TINYINT(1) NOT NULL DEFAULT 1,
  cor_hex CHAR(7) NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (codigo),
  KEY idx_report_statuses_ativo_ordem (ativo, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orgaos_publicos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(140) NOT NULL,
  sigla VARCHAR(20) NULL,
  email_contato VARCHAR(180) NULL,
  telefone_contato VARCHAR(30) NULL,
  endereco VARCHAR(255) NULL,
  horario_funcionamento VARCHAR(120) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_orgaos_publicos_nome (nome),
  KEY idx_orgaos_publicos_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  id CHAR(36) NOT NULL,
  protocolo VARCHAR(30) GENERATED ALWAYS AS (
    CONCAT('VB-', YEAR(criado_em), '-', UPPER(SUBSTRING(id, 1, 5)))
  ) STORED,
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT NULL,
  categoria VARCHAR(30) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  imagem_url VARCHAR(500) NULL,
  imagem_public_id VARCHAR(255) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  user_id CHAR(36) NOT NULL,
  anonimo TINYINT(1) NOT NULL DEFAULT 0,

  -- Campos opcionais para evolução sem quebrar o site atual.
  bairro VARCHAR(100) NULL,
  endereco_texto VARCHAR(255) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(120) NULL,
  ponto_referencia VARCHAR(255) NULL,
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  data_encerramento DATETIME(3) NULL,

  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uk_reports_protocolo (protocolo),
  KEY idx_reports_user_created (user_id, criado_em),
  KEY idx_reports_status_created (status, criado_em),
  KEY idx_reports_categoria_created (categoria, criado_em),
  KEY idx_reports_lat_lng (latitude, longitude),
  KEY idx_reports_anonimo (anonimo),

  CONSTRAINT fk_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_categoria
    FOREIGN KEY (categoria) REFERENCES report_categories(codigo)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_status
    FOREIGN KEY (status) REFERENCES report_statuses(codigo)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_reports_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_reports_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gera UUID automaticamente quando o backend não enviar id.
DELIMITER //
CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END//

CREATE TRIGGER trg_reports_before_insert
BEFORE INSERT ON reports
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END//
DELIMITER ;

CREATE TABLE report_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id CHAR(36) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  tamanho_bytes BIGINT UNSIGNED NULL,
  descricao VARCHAR(255) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_report_attachments_report (report_id),
  CONSTRAINT fk_report_attachments_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id CHAR(36) NOT NULL,
  status_antigo VARCHAR(30) NULL,
  status_novo VARCHAR(30) NOT NULL,
  alterado_por CHAR(36) NULL,
  mensagem VARCHAR(500) NULL,
  visivel_cidadao TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_report_status_history_report_created (report_id, criado_em),
  KEY idx_report_status_history_status (status_novo),
  CONSTRAINT fk_report_status_history_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_report_status_history_status_new
    FOREIGN KEY (status_novo) REFERENCES report_statuses(codigo)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_report_status_history_status_old
    FOREIGN KEY (status_antigo) REFERENCES report_statuses(codigo)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_report_status_history_user
    FOREIGN KEY (alterado_por) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registra histórico básico quando uma denúncia nasce ou muda de status.
DELIMITER //
CREATE TRIGGER trg_reports_after_insert_history
AFTER INSERT ON reports
FOR EACH ROW
BEGIN
  INSERT INTO report_status_history
    (report_id, status_antigo, status_novo, alterado_por, mensagem, visivel_cidadao, criado_em)
  VALUES
    (NEW.id, NULL, NEW.status, NEW.user_id, 'Denúncia registrada no sistema.', 1, NEW.criado_em);
END//

CREATE TRIGGER trg_reports_after_update_history
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO report_status_history
      (report_id, status_antigo, status_novo, alterado_por, mensagem, visivel_cidadao, criado_em)
    VALUES
      (NEW.id, OLD.status, NEW.status, NULL, CONCAT('Status alterado para ', NEW.status, '.'), 1, CURRENT_TIMESTAMP(3));
  END IF;
END//
DELIMITER ;

CREATE TABLE report_encaminhamentos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id CHAR(36) NOT NULL,
  orgao_id BIGINT UNSIGNED NOT NULL,
  funcionario_id CHAR(36) NULL,
  motivo VARCHAR(500) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  concluido_em DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_report_encaminhamentos_report (report_id),
  KEY idx_report_encaminhamentos_orgao (orgao_id),
  CONSTRAINT fk_report_encaminhamentos_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_report_encaminhamentos_orgao
    FOREIGN KEY (orgao_id) REFERENCES orgaos_publicos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_report_encaminhamentos_user
    FOREIGN KEY (funcionario_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE OR REPLACE VIEW vw_reports_api AS
SELECT
  r.id,
  r.protocolo,
  r.titulo,
  r.descricao,
  r.categoria,
  c.nome AS categoria_nome,
  c.emoji AS categoria_emoji,
  r.latitude,
  r.longitude,
  r.imagem_url,
  r.imagem_public_id,
  r.status,
  s.nome AS status_nome,
  r.user_id,
  r.anonimo,
  CASE WHEN r.anonimo = 1 THEN 'Anônimo' ELSE u.nome END AS autor_nome,
  CASE WHEN r.anonimo = 1 THEN NULL ELSE u.email END AS autor_email,
  JSON_OBJECT(
    'id', CASE WHEN r.anonimo = 1 THEN NULL ELSE u.id END,
    'nome', CASE WHEN r.anonimo = 1 THEN 'Anônimo' ELSE u.nome END,
    'email', CASE WHEN r.anonimo = 1 THEN NULL ELSE u.email END,
    'role', CASE WHEN r.anonimo = 1 THEN NULL ELSE u.role END,
    'anonimo', r.anonimo
  ) AS autor,
  r.bairro,
  r.endereco_texto,
  r.prioridade,
  r.data_encerramento,
  r.criado_em,
  r.atualizado_em
FROM reports r
JOIN users u ON u.id = r.user_id
JOIN report_categories c ON c.codigo = r.categoria
JOIN report_statuses s ON s.codigo = r.status;


INSERT INTO report_categories (codigo, nome, emoji, descricao, area_responsavel, ordem) VALUES
  ('buraco', 'Buraco na via', '🕳️', 'Buracos, deformações e problemas no asfalto ou pavimento', 'Infraestrutura Urbana', 1),
  ('lixo', 'Descarte irregular', '🗑️', 'Lixo, entulho e descarte irregular em áreas públicas', 'Limpeza Urbana', 2),
  ('iluminacao', 'Iluminação pública', '💡', 'Postes apagados, lâmpadas queimadas e falhas na rede de iluminação', 'Infraestrutura Urbana', 3),
  ('calcada', 'Calçada danificada', '🚶', 'Calçadas quebradas, obstruídas ou perigosas para pedestres', 'Obras e Mobilidade', 4),
  ('sinalizacao', 'Sinalização', '🚧', 'Placas, pintura viária, semáforos e sinalização urbana', 'Trânsito', 5),
  ('esgoto', 'Esgoto', '💧', 'Vazamentos, mau cheiro, bueiros e problemas de saneamento', 'Saneamento', 6),
  ('outro', 'Outro', '📍', 'Ocorrências urbanas que não se encaixam nas demais categorias', 'Ouvidoria', 7);

INSERT INTO report_statuses (codigo, nome, descricao, visivel_cidadao, cor_hex, ordem) VALUES
  ('pendente', 'Recebida', 'Denúncia registrada e aguardando análise inicial', 1, '#F59E0B', 1),
  ('em_analise', 'Em análise', 'Denúncia em análise pela equipe responsável', 1, '#3B82F6', 2),
  ('em_andamento', 'Em andamento', 'Atendimento ou encaminhamento em execução', 1, '#8B5CF6', 3),
  ('resolvido', 'Resolvida', 'Problema resolvido ou atendimento concluído', 1, '#22C55E', 4),
  ('rejeitado', 'Rejeitada', 'Denúncia arquivada, recusada ou sem procedência', 1, '#EF4444', 5);

INSERT INTO orgaos_publicos (nome, sigla, email_contato, telefone_contato, endereco) VALUES
  ('Secretaria de Infraestrutura Urbana', 'SIU', 'infraestrutura@videira.sc.gov.br', '(49) 3533-2101', 'Manutenção urbana, vias e iluminação pública.'),
  ('Departamento de Limpeza Urbana', 'DLU', 'limpeza@videira.sc.gov.br', '(49) 3533-2103', 'Coleta especial, entulho e limpeza pública.'),
  ('Serviço Municipal de Água e Saneamento', 'SMAS', 'saneamento@videira.sc.gov.br', '(49) 3533-2104', 'Vazamentos, esgoto e saneamento.'),
  ('Departamento de Trânsito', 'DTRANS', 'transito@videira.sc.gov.br', '(49) 3533-2106', 'Sinalização e mobilidade urbana.'),
  ('Ouvidoria Municipal', 'OUV', 'ouvidoria@videira.sc.gov.br', '(49) 3533-2100', 'Triagem e atendimento inicial das ocorrências.');

INSERT INTO users (id, nome, email, senha, role, ativo, criado_em, atualizado_em) VALUES
  ('642a8796-6e3a-4db1-a4ff-4004cbfe55a2', 'Teste', 'a@b.com', 'teste-da-senha', 'user', 1, '2026-04-22 23:29:48.817', '2026-04-22 23:29:48.817'),
  ('61dbeef7-9810-4c76-a84c-240ee089bb15', 'Gilberto', 'gilberto@gmail.com', '$2a$12$FZQbKexdqnwWP/DbCTT6Qu8FQHao9szXB2cXbWTMPMbvIsFRgppzG', 'admin', 1, '2026-04-24 12:20:10.995', '2026-04-24 12:20:10.995'),
  ('2dfd7436-8b9e-4163-b491-a6b2f05a024c', 'Matheus de Paula', 'Matheus@gmail.com', '$2a$12$d8.pxSKykWluZ8nRGhQYdOCDRdI/Hfw7wYtUjP5TjY1mu7aPN2Jy6', 'user', 1, '2026-04-24 12:23:50.446', '2026-04-24 12:23:50.446'),
  ('d779e8df-2a6e-4c05-855f-cb91eeb7e35f', 'teste-senha-1234567', 'admin@prefeitura.gov.br', '$2a$12$yS/yhwtMnr1fldrvqqAe3uJ4LD9Ffgchvuha47kBSuyXYCgo3y3EO', 'admin', 1, '2026-05-21 11:28:08.337', '2026-05-21 11:28:08.337'),
  ('9325231b-7b19-48de-afff-4e96fce45e93', 'zack-bocó', 'zack@gmail.com', '$2a$12$yV/nTHyhmuyK4ZCv9pp8DOMNwnbFAeP9poA6evvaTRWQaBYF0QusS', 'user', 1, '2026-05-21 11:32:28.256', '2026-05-21 11:32:28.256'),
  ('1f6767ed-4283-4e32-a257-56d9e02bab26', 'Usuário legado migrado', 'usuario.legado+1f6767ed@local.invalid', 'usuario-legado-inativo-sem-login', 'user', 0, '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000');

INSERT INTO reports (id, titulo, descricao, categoria, latitude, longitude, imagem_url, imagem_public_id, status, user_id, anonimo, criado_em, atualizado_em) VALUES
  ('3d148ee4-1316-4f8d-a5ab-14bc61730cb7', 'Degradação da via', 'Devido a frequência de caminhões na via, o asfalto se moldou e resulto em uma grande elevação do asfalto, tornando a travessia de motoqueiros perigosa.', 'buraco', -27.02906948947779, -51.14932894706727, '/uploads/report-1778843809359-690142070.jpg', 'report-1778843809359-690142070.jpg', 'pendente', '1f6767ed-4283-4e32-a257-56d9e02bab26', 0, '2026-05-15 11:16:49.365', '2026-05-15 11:16:49.365'),
  ('cbe2c671-6b5b-4635-945e-a3b01cebcd02', 'Poste com fios soltos', 'Poste em frente a residência número 360 está com os fios de luz exposto, favor ajustar este problema, pois existe uma grande passagem de pedestres pelo local', 'iluminacao', -27.007264294377098, -51.116251945495605, '/uploads/report-1778844295777-881986647.jpg', 'report-1778844295777-881986647.jpg', 'em_analise', '61dbeef7-9810-4c76-a84c-240ee089bb15', 0, '2026-05-15 11:24:55.779', '2026-05-15 11:49:39.119'),
  ('1678e8da-3f15-4d10-a130-1b50dff7b349', 'lixo', 'teste', 'lixo', -27.00121696722668, -51.24214410781861, NULL, NULL, 'pendente', '61dbeef7-9810-4c76-a84c-240ee089bb15', 0, '2026-05-15 11:50:37.701', '2026-05-15 11:50:37.701'),
  ('55f3a603-7d16-48ec-af19-8c2a04767c62', 'teste', 'teste', 'sinalizacao', -27.00708805302869, -51.147161722183235, NULL, NULL, 'em_andamento', '61dbeef7-9810-4c76-a84c-240ee089bb15', 0, '2026-05-15 11:51:13.509', '2026-05-15 11:51:20.860'),
  ('34981c66-aa5d-487e-bbd3-f07954eb7506', 'teste', 'teste', 'outro', -27.001513306979685, -51.15341663360596, NULL, NULL, 'resolvido', '61dbeef7-9810-4c76-a84c-240ee089bb15', 0, '2026-05-15 12:15:43.688', '2026-05-21 11:07:23.439'),
  ('64f8a636-7518-4258-8e70-cbb74e78a5e2', 'teste', '', 'esgoto', -27.00793699610242, -51.15074515342713, NULL, NULL, 'pendente', '1f6767ed-4283-4e32-a257-56d9e02bab26', 0, '2026-05-15 12:41:23.281', '2026-05-15 12:41:23.281'),
  ('ead76bf7-addd-432d-8c92-e5c35f0bf418', 'teste de anonimato', 'teste', 'buraco', -27.026202355743862, -51.14424347877503, NULL, NULL, 'pendente', '2dfd7436-8b9e-4163-b491-a6b2f05a024c', 1, '2026-05-21 11:16:40.972', '2026-05-21 11:16:40.972'),
  ('d96b8e57-4b79-4ee1-88ef-81229642a5d4', 'tem um poste sem a luz', 'poste sem luz perto da minha casa', 'iluminacao', -27.010412694957115, -51.11787199974061, '/uploads/report-1779363242382-587914485.jpg', 'report-1779363242382-587914485.jpg', 'pendente', '9325231b-7b19-48de-afff-4e96fce45e93', 1, '2026-05-21 11:34:02.386', '2026-05-21 11:34:02.386'),
  ('9fffc173-7e1e-4d7c-b616-d32a5fc0fbf6', 'tem um buraco na via.', 'buraco na via me frente ao zé refrigerações ', 'buraco', -27.023325591342942, -51.13630414009094, '/uploads/report-1779363404563-634402347.jpg', 'report-1779363404563-634402347.jpg', 'pendente', '9325231b-7b19-48de-afff-4e96fce45e93', 0, '2026-05-21 11:36:44.565', '2026-05-21 11:36:44.565'),
  ('9290244c-0988-4274-8aee-8a6cc4f79583', 'esse zack é muito bocó', 'isso ai', 'sinalizacao', -27.009284777144508, -51.15167856216431, '/uploads/report-1779453250906-304780762.png', 'report-1779453250906-304780762.png', 'pendente', '9325231b-7b19-48de-afff-4e96fce45e93', 1, '2026-05-22 12:34:10.909', '2026-05-22 12:34:10.909'),
  ('0d795398-666a-4b0e-884e-f58a577ea0a8', 'asdasd', 'asdasd', 'sinalizacao', -27.00973403390071, -51.14899635314942, '/uploads/report-1779453276203-600090155.png', 'report-1779453276203-600090155.png', 'pendente', '9325231b-7b19-48de-afff-4e96fce45e93', 0, '2026-05-22 12:34:36.205', '2026-05-22 12:34:36.205');

INSERT INTO report_attachments (report_id, nome_arquivo, url, public_id, mime_type, descricao) VALUES
  ('3d148ee4-1316-4f8d-a5ab-14bc61730cb7', 'report-1778843809359-690142070.jpg', '/uploads/report-1778843809359-690142070.jpg', 'report-1778843809359-690142070.jpg', 'image/jpeg', 'Imagem principal migrada do JSON'),
  ('cbe2c671-6b5b-4635-945e-a3b01cebcd02', 'report-1778844295777-881986647.jpg', '/uploads/report-1778844295777-881986647.jpg', 'report-1778844295777-881986647.jpg', 'image/jpeg', 'Imagem principal migrada do JSON'),
  ('d96b8e57-4b79-4ee1-88ef-81229642a5d4', 'report-1779363242382-587914485.jpg', '/uploads/report-1779363242382-587914485.jpg', 'report-1779363242382-587914485.jpg', 'image/jpeg', 'Imagem principal migrada do JSON'),
  ('9fffc173-7e1e-4d7c-b616-d32a5fc0fbf6', 'report-1779363404563-634402347.jpg', '/uploads/report-1779363404563-634402347.jpg', 'report-1779363404563-634402347.jpg', 'image/jpeg', 'Imagem principal migrada do JSON'),
  ('9290244c-0988-4274-8aee-8a6cc4f79583', 'report-1779453250906-304780762.png', '/uploads/report-1779453250906-304780762.png', 'report-1779453250906-304780762.png', 'image/png', 'Imagem principal migrada do JSON'),
  ('0d795398-666a-4b0e-884e-f58a577ea0a8', 'report-1779453276203-600090155.png', '/uploads/report-1779453276203-600090155.png', 'report-1779453276203-600090155.png', 'image/png', 'Imagem principal migrada do JSON');
