# Plano de Projeto – VidEita

## Informações do Projeto

| Campo | Descrição |
|---------|---------|
| Projeto | VidEita |
| Tipo | Plataforma Web de Comunicação Cidadã |
| Instituição | IFC – Campus Videira |
| Autores |Matheus Varela de Paula e Zack Zayry Gomes da Silva |

---

# 1. Resumo

O VidEita é uma plataforma web desenvolvida para aproximar os cidadãos da cidade de Videira dos órgãos públicos responsáveis pela manutenção urbana.

A plataforma permite que moradores registrem ocorrências relacionadas à infraestrutura da cidade, como buracos em vias públicas, descarte irregular de lixo, problemas de iluminação, sinalização danificada, esgoto e outras situações que necessitem de atenção dos órgãos competentes.

O sistema busca simplificar o processo de comunicação entre população e poder público, proporcionando transparência, rastreabilidade e acompanhamento das solicitações realizadas.

---

# 2. Problema

Atualmente, muitos problemas urbanos não são comunicados de forma eficiente aos órgãos responsáveis.

Entre os principais problemas identificados estão:

- Falta de um canal centralizado de comunicação.
- Dificuldade de acompanhar denúncias e solicitações.
- Demora na identificação de problemas urbanos.
- Falta de transparência sobre o andamento das solicitações.
- Dependência de atendimento presencial ou telefônico.

---

# 3. Objetivos

## 3.1 Objetivo Geral

Criar uma plataforma digital que permita aos cidadãos registrar e acompanhar ocorrências urbanas de forma simples, segura e transparente.

## 3.2 Objetivos Específicos

- Facilitar a comunicação entre cidadãos e órgãos públicos.
- Centralizar denúncias e solicitações urbanas.
- Permitir acompanhamento em tempo real.
- Disponibilizar informações geográficas das ocorrências.
- Melhorar a eficiência do atendimento público.
- Gerar dados para gestão urbana.

---

# 4. Escopo

## Dentro do Escopo

### Cadastro de Usuários

- Registro de conta
- Login
- Recuperação de acesso

### Gestão de Ocorrências

- Criação de ocorrência
- Consulta de ocorrência
- Atualização de status
- Arquivamento

### Geolocalização

- Marcação da ocorrência no mapa
- Visualização geográfica

### Upload de Imagens

- Envio de evidências fotográficas

### Consulta Pública

- Visualização de ocorrências no mapa

### Administração

- Gestão de ocorrências
- Atualização de status
- Relatórios

---

# 5. Público-Alvo

## Cidadãos

Moradores da cidade de Videira interessados em reportar problemas urbanos.

## Administradores

Servidores responsáveis pelo recebimento e encaminhamento das ocorrências.

## Órgãos Públicos

Setores responsáveis pela resolução das ocorrências registradas.

---

# 6. Requisitos Funcionais

## RF01 – Cadastro de Usuário

O sistema deve permitir o cadastro de usuários através de:

- Nome completo
- E-mail
- Senha
- Google
---

## RF02 – Login

O sistema deve permitir autenticação utilizando:

- E-mail
- Senha
- Google

---

## RF03 – Registro de Ocorrência

O cidadão deve conseguir registrar uma ocorrência contendo:

- Categoria
- Título
- Descrição
- Localização
- Foto opcional

---

## RF04 – Categorias de Ocorrência

O sistema deve disponibilizar as seguintes categorias:

- Buraco na via
- Descarte irregular
- Iluminação pública
- Calçada danificada
- Sinalização
- Esgoto
- Outro

---

## RF05 – Upload de Imagem

O sistema deve permitir anexar imagens.

Formatos aceitos:

- JPG
- PNG
- WEBP
- HEIC
- HEIF

Tamanho máximo:

- 15 MB

---

## RF06 – Geolocalização

O usuário deve marcar a localização da ocorrência através de um mapa interativo.

---

## RF07 – Anonimato

O sistema deve permitir que o usuário escolha entre:

- Identificar-se
- Permanecer anônimo

---

## RF08 – Geração de Protocolo

Cada ocorrência deve receber um número único de protocolo.

Exemplo:

```text
VB-2026-12345
```

---

## RF09 – Acompanhamento

O cidadão deve conseguir acompanhar o andamento das suas ocorrências.

---

## RF10 – Consulta de Histórico

O sistema deve manter histórico completo das ocorrências.

---

## RF11 – Visualização em Mapa

O sistema deve exibir ocorrências em um mapa da cidade.

---

## RF12 – Gerenciamento Administrativo

Administradores devem poder:

- Visualizar ocorrências
- Atualizar status
- Encaminhar ocorrências
- Arquivar registros

---

## RF13 – Relatórios

O sistema deve gerar relatórios de:

- Ocorrências registradas
- Ocorrências resolvidas
- Ocorrências por categoria
- Ocorrências por região

---

# 7. Requisitos Não Funcionais

## RNF01 – Segurança

Os dados dos usuários devem ser protegidos.

---

## RNF02 – Sigilo

O sistema deve preservar a identidade dos denunciantes anônimos.

---

## RNF03 – Disponibilidade

O sistema deve estar disponível 24 horas por dia.

---

## RNF04 – Usabilidade

O fluxo de registro deve ser simples e intuitivo.

---

## RNF05 – Responsividade

O sistema deve funcionar em:

- Smartphones
- Tablets
- Computadores

---

## RNF06 – Escalabilidade

O sistema deve suportar crescimento no número de usuários e ocorrências.

---

## RNF07 – Confiabilidade

As informações registradas devem ser armazenadas de forma segura.

---

## RNF08 – Desempenho

O carregamento das páginas deve ocorrer em poucos segundos.

---

# 8. Regras de Negócio

## RN01

Toda ocorrência deve possuir uma categoria válida.

---

## RN02

Título é obrigatório.

---

## RN03

Descrição é obrigatória.

---

## RN04

A localização deve ser informada.

---

## RN05

Cada ocorrência recebe um protocolo único.

---

## RN06

Ocorrências iniciam com status:

```text
Recebida
```

---

## RN07

Somente administradores podem alterar o status.

---

## RN08

Usuários anônimos não terão seus dados exibidos.

---

## RN09

Fotos devem respeitar o limite de 15 MB.

---

## RN10

Ocorrências arquivadas permanecem disponíveis para consulta.

---

# 9. Fluxo de Negócio

```text
Registro da Ocorrência
           ↓
Recebimento pelo Sistema
           ↓
Análise Inicial
           ↓
Encaminhamento ao Órgão
           ↓
Em Andamento
           ↓
Concluída ou Rejeitada
           ↓
Arquivamento
```

---

# 10. Estados da Ocorrência

```text
Recebida
↓
Em Análise
↓
Em Andamento
↓
Concluída
```

ou

```text
Recebida
↓
Em Análise
↓
Rejeitada
```

ou

```text
Concluída
↓
Arquivada
```
# 11. Tecnologias Propostas

## Front-end

- HTML5
- CSS3
- JavaScript

## Back-end

- Node.js
- Express.js

## Banco de Dados

- MySQL

## Infraestrutura

- Docker
- NGINX

## Versionamento

- Git
- GitHub

---

# 12. Considerações Finais

O VidEita representa uma solução tecnológica voltada para a melhoria da comunicação entre cidadãos e órgãos públicos. A plataforma contribui para uma gestão urbana mais eficiente, transparente e participativa, fortalecendo o papel da população na identificação e resolução de problemas da cidade. https://www.figma.com/design/YjL1aTXOGOos1bbX2Q7prP/Pages?t=CgaTJBWManS2csp7-0
