# Project TODO - Real 94 Mala Direta

## Infraestrutura
- [x] Upload e configuração do logo corporativo
- [x] Esquema relacional completo do banco de dados (users, contacts, lists, campaigns, logs, attachments)
- [x] Configuração de tema e cores (light theme, estilo Brevo)

## Backend API
- [x] DB helpers para contatos (CRUD)
- [x] DB helpers para listas (CRUD)
- [x] DB helpers para campanhas (CRUD + wizard flow)
- [x] DB helpers para logs de auditoria
- [x] Router tRPC para contatos
- [x] Router tRPC para listas
- [x] Router tRPC para campanhas (wizard completo)
- [x] Router tRPC para logs/auditoria
- [x] Lógica de Quick Import (parsing de texto tabulado Excel)
- [x] Lógica de confirmação dupla de assunto
- [x] Motor de homologação (envio de e-mail de teste)
- [x] Endpoint de envio em massa (preparado para SMTP/API)
- [x] Upload de imagens e anexos via S3

## Frontend - Layout
- [x] Sidebar lateral estilo Brevo (Início, CRM, Marketing)
- [x] DashboardLayout customizado com navegação
- [x] Tema e cores profissionais (light, clean)

## Frontend - Páginas
- [x] Dashboard/Home com visão geral
- [x] Página de Contatos (tabela estilo Brevo)
- [x] Página de Listas (tabela com gestão)
- [x] Quick Import (textarea inteligente para colar Excel)
- [x] Wizard de Campanha - Passo 1: Selecionar/Criar Lista
- [x] Wizard de Campanha - Passo 2: Definir Assunto
- [x] Wizard de Campanha - Passo 3: Confirmar Assunto (validação dupla)
- [x] Wizard de Campanha - Passo 4: Editor de Conteúdo (HTML + imagem + anexos)
- [x] Wizard de Campanha - Passo 5: Homologação (envio de teste)
- [x] Wizard de Campanha - Passo 6: Confirmação e Envio Final
- [x] Painel de Auditoria (logs com status em tempo real)
- [x] Página de Perfil do Usuário
- [x] Página de Configurações SMTP
- [x] Página de listagem de Campanhas

## Testes
- [x] Testes vitest para lógica de campanhas (10 testes)
- [x] Testes vitest para Quick Import parsing (4 testes)
- [x] Teste de auth.logout (1 teste)

## Alterações solicitadas pelo usuário
- [x] Alterar tema de verde (Brevo) para vermelho corporativo da Real 94 (transportadora)
- [x] Ajustar textos e contexto para transportadora Real 94

## Solicitação do usuário - Tela de Login
- [x] Melhorar a tela de login com design profissional e identidade visual Real 94

## Solicitação do usuário - Logo
- [x] Aumentar o tamanho do logo Real 94 na tela de login e na sidebar

## Bugs e melhorias - Contatos
- [x] Bug: contatos não ficam salvos no banco de dados
- [x] Melhoria: Quick Import deve aceitar dados colados diretamente do Excel (colar planilha)

## Melhoria - Editor de Conteúdo HTML
- [x] Adicionar suporte para upload de arquivo HTML no editor de conteúdo do wizard de campanha (inserir arquivo direto)

## Melhoria - Importação Drag & Drop
- [x] Implementar drag & drop de arquivos Excel/CSV na importação de contatos (arrastar planilha e processar automaticamente)

## Adaptação para Xano
- [x] Definir esquema completo das tabelas para criar no Xano (GUIA-XANO-SETUP.md)
- [x] Definir todos os endpoints API REST necessários no Xano (GUIA-XANO-SETUP.md)
- [x] Criar camada de abstração server/xano.ts para chamadas REST
- [x] Criar server/db-xano.ts compatível com os routers existentes
- [x] Criar guia passo a passo completo (GUIA-XANO-SETUP.md)
- [x] Criar script de setup local (setup-local.mjs)
- [ ] Testar integração completa (depende do Xano do usuário)

## Bug - Wizard de Campanha HTML
- [x] Bug crítico: coluna htmlContent era TEXT (64KB) - insuficiente para e-mails completos
- [x] Migração: htmlContent alterada de TEXT para MEDIUMTEXT (16MB) no banco de dados
- [x] Bug: wizard trava ao importar HTML pesado com scripts e avançar para o próximo passo
- [x] Sanitização de HTML com DOMPurify (remove scripts, iframes, event handlers)
- [x] Preview seguro via iframe sandbox (sem allow-scripts)
- [x] Validação de tamanho de HTML (máx. 2MB) no frontend e backend
- [x] Estado de carregamento durante importação de HTML
- [x] Feedback visual de elementos perigosos detectados
- [x] Testes vitest para validação de tamanho de HTML (5 testes)

## Auth Próprio (Login/Senha sem OAuth Manus)
- [x] Criar tela de login própria (email + senha) independente do OAuth Manus
- [x] Criar endpoint POST /api/auth/login no servidor com JWT
- [x] Criar endpoint POST /api/auth/logout no servidor
- [x] Criar endpoint GET /api/auth/me no servidor (via tRPC existente)
- [x] Integrar login com banco TiDB (passwordHash bcrypt/SHA-256)
- [x] Adaptar useAuth() — usa tRPC auth.me (compatível com ambos os modos)
- [x] Adaptar DashboardLayout para redirecionar para /login próprio (via getLoginUrl)
- [x] Remover dependência do VITE_OAUTH_PORTAL_URL no frontend (modo local automático)
- [x] Suporte a modo dual: OAuth Manus (produção) + Login próprio (local)
- [x] Script create-admin.mjs para criar/atualizar senha de admin via CLI

## Bug - SSL no Windows
- [x] Bug: DATABASE_URL com ssl JSON na query string falha no Windows (mysql2 não aceita o perfil SSL como string JSON)
- [x] Corrigir db.ts para parsear SSL manualmente fora da URL (cria pool mysql2 diretamente)
