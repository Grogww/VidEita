-- Cria o usuario do banco usado pelo backend em ambiente Docker.
-- Usuario do MySQL: admin
-- Senha do MySQL: admin123
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'admin123';
GRANT ALL PRIVILEGES ON base_projeto_integrador.* TO 'admin'@'%';
FLUSH PRIVILEGES;
