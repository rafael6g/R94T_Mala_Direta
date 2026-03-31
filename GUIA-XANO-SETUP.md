# Guia Completo: Real 94 Mala Direta — Setup Local + Xano

Este guia detalha como rodar o sistema Real 94 Mala Direta na sua máquina local, usando o **Xano** como banco de dados via API REST.

---

## Sumário

1. [Pré-requisitos](#1-pr%C3%A9-requisitos)

1. [Criar as Tabelas no Xano](#2-criar-as-tabelas-no-xano)

1. [Criar os Endpoints REST no Xano](#3-criar-os-endpoints-rest-no-xano)

1. [Configurar o Projeto Local](#4-configurar-o-projeto-local)

1. [Executar o Sistema](#5-executar-o-sistema)

1. [Testar o Fluxo Completo](#6-testar-o-fluxo-completo)

1. [Solução de Problemas](#7-solu%C3%A7%C3%A3o-de-problemas)

---

## 1. Pré-requisitos

Antes de começar, certifique-se de ter instalado na sua máquina:

| Software | Versão Mínima | Como Instalar |
| --- | --- | --- |
| **Node.js** | 18+ (recomendado 22) | [nodejs.org](https://nodejs.org) |
| **pnpm** | 8+ | `npm install -g pnpm` |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com) | Guia Completo: Real 94 Mala Direta — Setup Local + XanoÚltima modificação: Há 13 minutos |  | Guia Completo: Real 94 Mala Direta — Setup Local + XanoÚltima modificação: Há 13 minutos |  |

Você também precisa de uma **conta ativa no Xano** com um workspace criado.

---

## 2. Criar as Tabelas no Xano

Acesse o seu workspace no Xano e crie as seguintes **7 tabelas** com os campos exatos listados abaixo. No Xano, o campo `id` (auto-increment) já é criado automaticamente.

### Tabela 1: `users`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `name` | Text | Não | — | Nome completo |
| `email` | Text | Sim | — | Único, usado para login |
| `password` | Password | Sim | — | Hash automático do Xano |
| `role` | Enum (`user`, `admin`) | Sim | `user` | Controle de acesso |
| `lastSignedIn` | Timestamp | Não | — | Último login |

### Tabela 2: `contact_lists`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `user_id` | Integer (ref: users) | Sim | — | FK para users |
| `name` | Text | Sim | — | Nome da lista |
| `description` | Text | Não | — | Descrição |
| `folder` | Text | Não | — | Pasta organizacional |
| `contactCount` | Integer | Sim | `0` | Contagem de contatos |

### Tabela 3: `contacts`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `user_id` | Integer (ref: users) | Sim | — | FK para users |
| `email` | Text | Sim | — | E-mail do contato |
| `firstName` | Text | Não | — | Primeiro nome |
| `lastName` | Text | Não | — | Sobrenome |
| `phone` | Text | Não | — | Telefone |
| `company` | Text | Não | — | Empresa |
| `subscribed` | Boolean | Sim | `true` | Se está inscrito |
| `customFields` | JSON | Não | — | Campos personalizados |

### Tabela 4: `contact_list_members`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `contact_id` | Integer (ref: contacts) | Sim | — | FK para contacts |
| `list_id` | Integer (ref: contact_lists) | Sim | — | FK para contact_lists |

### Tabela 5: `campaigns`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `user_id` | Integer (ref: users) | Sim | — | FK para users |
| `name` | Text | Sim | — | Nome da campanha |
| `status` | Enum | Sim | `draft` | Valores: `draft`, `subject_defined`, `subject_confirmed`, `content_ready`, `test_sent`, `sending`, `sent`, `failed` |
| `list_id` | Integer (ref: contact_lists) | Não | — | FK para contact_lists |
| `subject` | Text | Não | — | Assunto do e-mail |
| `subjectConfirmed` | Boolean | Sim | `false` | Se o assunto foi confirmado |
| `previewText` | Text | Não | — | Texto de pré-visualização |
| `senderName` | Text | Não | — | Nome do remetente |
| `senderEmail` | Text | Não | — | E-mail do remetente |
| `contentType` | Enum (`html`, `image`, `template`) | Não | `html` | Tipo de conteúdo |
| `htmlContent` | Text | Não | — | Conteúdo HTML do e-mail |
| `imageUrl` | Text | Não | — | URL da imagem |
| `recipientCount` | Integer | Não | `0` | Total de destinatários |
| `sentCount` | Integer | Não | `0` | Enviados com sucesso |
| `failedCount` | Integer | Não | `0` | Falhas no envio |
| `testSentAt` | Timestamp | Não | — | Data do envio de teste |
| `testSentTo` | Text | Não | — | E-mail do teste |
| `sentAt` | Timestamp | Não | — | Data do envio final |

### Tabela 6: `campaign_attachments`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `campaign_id` | Integer (ref: campaigns) | Sim | — | FK para campaigns |
| `fileName` | Text | Sim | — | Nome do arquivo |
| `fileUrl` | Text | Sim | — | URL do arquivo |
| `mimeType` | Text | Não | — | Tipo MIME |
| `fileSize` | Integer | Não | — | Tamanho em bytes |

### Tabela 7: `audit_logs`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `user_id` | Integer (ref: users) | Sim | — | FK para users |
| `action` | Text | Sim | — | Ação realizada |
| `entityType` | Text | Sim | — | Tipo da entidade |
| `entityId` | Integer | Não | — | ID da entidade |
| `details` | Text | Não | — | Detalhes da operação |
| `status` | Enum (`success`, `error`, `pending`, `in_progress`) | Sim | `success` | Status |
| `ipAddress` | Text | Não | — | IP do usuário |

### Tabela 8: `smtp_settings`

| Campo | Tipo | Obrigatório | Padrão | Notas |
| --- | --- | --- | --- | --- |
| `user_id` | Integer (ref: users) | Sim | — | FK para users |
| `host` | Text | Sim | — | Host SMTP |
| `port` | Integer | Sim | `587` | Porta SMTP |
| `username` | Text | Sim | — | Usuário SMTP |
| `password` | Text | Sim | — | Senha SMTP |
| `encryption` | Enum (`tls`, `ssl`, `none`) | Sim | `tls` | Tipo de criptografia |
| `fromEmail` | Text | Sim | — | E-mail remetente |
| `fromName` | Text | Não | — | Nome remetente |
| `isActive` | Boolean | Sim | `true` | Se está ativo |

---

## 3. Criar os Endpoints REST no Xano

Para cada tabela, crie os seguintes **API Endpoints** no Xano. Use o recurso "Add API Group" e depois "Add API Endpoint" para cada operação.

### Grupo: `/auth`

| Método | Endpoint | Descrição | Autenticação |
| --- | --- | --- | --- |
| POST | `/auth/signup` | Criar conta (usa tabela `users`) | Não |
| POST | `/auth/login` | Login (retorna authToken do Xano) | Não |
| GET | `/auth/me` | Retorna dados do usuário logado | Sim |

**Configuração do ****`/auth/signup`****:**

- Input: `name` (text), `email` (text), `password` (password)

- Lógica: Criar registro na tabela `users` com `role = "admin"` (primeiro usuário)

- Output: `authToken` (usar o Auth Token do Xano)

**Configuração do ****`/auth/login`****:**

- Input: `email` (text), `password` (password)

- Lógica: Buscar usuário por email, verificar senha, atualizar `lastSignedIn`

- Output: `authToken`

**Configuração do ****`/auth/me`****:**

- Lógica: Retornar dados do usuário autenticado (exceto password)

- Output: `id`, `name`, `email`, `role`, `created_at`, `lastSignedIn`

### Grupo: `/contacts`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/contacts` | Listar contatos (com paginação, busca, filtro por lista) |
| GET | `/contacts/{id}` | Buscar contato por ID |
| POST | `/contacts` | Criar contato |
| PATCH | `/contacts/{id}` | Atualizar contato |
| DELETE | `/contacts/{id}` | Remover contato |
| POST | `/contacts/bulk` | Importação em massa |
| POST | `/contacts/add-to-list` | Adicionar contatos a uma lista |
| POST | `/contacts/remove-from-list` | Remover contato de uma lista |
| GET | `/contacts/{id}/lists` | Listar listas de um contato |

**Detalhes do GET ****`/contacts`****:**

- Query params: `search` (text), `list_id` (int), `page` (int, default 1), `limit` (int, default 20)

- Filtrar por `user_id` do token autenticado

- Se `search`: filtrar por email, firstName ou lastName (LIKE)

- Se `list_id`: filtrar por membros da lista

- Retornar: `{ contacts: [...], total: N }`

**Detalhes do POST ****`/contacts/bulk`****:**

- Input: `contacts` (array de objetos com email, firstName, lastName, phone, company)

- Lógica: Inserir todos na tabela `contacts` com `user_id` do token

- Retornar: `{ imported: N, ids: [...] }`

### Grupo: `/lists`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/lists` | Listar todas as listas do usuário |
| GET | `/lists/{id}` | Buscar lista por ID |
| POST | `/lists` | Criar lista |
| PATCH | `/lists/{id}` | Atualizar lista |
| DELETE | `/lists/{id}` | Remover lista (e membros) |

### Grupo: `/campaigns`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/campaigns` | Listar campanhas do usuário |
| GET | `/campaigns/{id}` | Buscar campanha por ID (com attachments) |
| POST | `/campaigns` | Criar campanha |
| DELETE | `/campaigns/{id}` | Remover campanha |
| PATCH | `/campaigns/{id}/select-list` | Atribuir lista à campanha |
| PATCH | `/campaigns/{id}/define-subject` | Definir assunto |
| PATCH | `/campaigns/{id}/confirm-subject` | Confirmar assunto (validação dupla) |
| PATCH | `/campaigns/{id}/set-content` | Definir conteúdo |
| POST | `/campaigns/{id}/attachments` | Adicionar anexo |
| DELETE | `/campaigns/attachments/{id}` | Remover anexo |
| GET | `/campaigns/{id}/status` | Status do envio |

**Nota importante sobre ****`/campaigns/{id}/confirm-subject`****:**

- Input: `confirmedSubject` (text)

- Lógica: Buscar a campanha, comparar `confirmedSubject` com o `subject` existente. Se forem diferentes, retornar erro. Se iguais, atualizar `subjectConfirmed = true` e `status = "subject_confirmed"`.

### Grupo: `/audit`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/audit` | Listar logs (com paginação e filtro por entityType) |

### Grupo: `/smtp`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/smtp` | Buscar configurações SMTP do usuário |
| POST | `/smtp` | Salvar/atualizar configurações SMTP |

### Grupo: `/dashboard`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/dashboard/stats` | Estatísticas (total contatos, listas, campanhas, enviadas) |

**Lógica do ****`/dashboard/stats`****:**

- Contar registros nas tabelas `contacts`, `contact_lists`, `campaigns` (total e com `status = "sent"`) filtrados pelo `user_id`

- Retornar: `{ totalContacts, totalLists, totalCampaigns, sentCampaigns }`

---

## 4. Configurar o Projeto Local

### 4.1 Baixar o Código

Baixe o código do projeto pelo painel de gerenciamento do Manus (aba "Code" > "Download all files") ou exporte para o GitHub (Settings > GitHub).

### 4.2 Instalar Dependências

```bash
cd mala-direta
pnpm install
```

### 4.3 Criar o Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
# === XANO ===
XANO_API_BASE_URL=https://SEU-WORKSPACE.xano.io/api:GRUPO
# Exemplo: https://x8ki-letl-twmt.n7.xano.io/api:mala-direta

# === AUTENTICAÇÃO LOCAL ===
JWT_SECRET=uma-chave-secreta-forte-com-pelo-menos-32-caracteres

# === APLICAÇÃO ===
VITE_APP_TITLE=Real 94 - Mala Direta
NODE_ENV=development
PORT=3000

# === SMTP (opcional - pode configurar pela interface  ) ===
# Estas variáveis são opcionais, o SMTP pode ser configurado pela interface web
```

**Como encontrar a URL base do Xano:**

1. Acesse seu workspace no Xano

1. Vá em "API" no menu lateral

1. Clique no grupo de API que você criou

1. A URL base aparece no topo, algo como: `https://x8ki-letl-twmt.n7.xano.io/api:mala-direta`

### 4.4 Substituir os Arquivos Adaptados

O projeto já vem com os arquivos adaptados para Xano. Os principais arquivos modificados são:

- `server/db.ts` — Camada de dados reescrita para chamar a API REST do Xano

- `server/_core/context.ts` — Autenticação adaptada para JWT local

- `server/_core/oauth.ts` — Substituído por login/signup local com e-mail e senha

- `client/src/components/DashboardLayout.tsx` — Tela de login com formulário local

- `client/src/pages/Profile.tsx` — Perfil adaptado

- `client/src/main.tsx` — Redirecionamento de auth adaptado

---

## 5. Executar o Sistema

### 5.1 Modo Desenvolvimento

```bash
pnpm dev
```

O sistema estará disponível em `http://localhost:3000`.

### 5.2 Criar o Primeiro Usuário (Admin )

1. Acesse `http://localhost:3000`

1. Na tela de login, clique em **"Criar conta"**

1. Preencha nome, e-mail e senha

1. O primeiro usuário será criado como **admin** automaticamente

### 5.3 Modo Produção

```bash
pnpm build
pnpm start
```

---

## 6. Testar o Fluxo Completo

Após criar sua conta, teste o fluxo completo:

1. **Importar contatos** — Vá em CRM > Contatos > Importar contatos. Cole dados do Excel ou arraste um arquivo .xlsx/.csv.

1. **Criar lista** — Vá em CRM > Listas > Criar lista. Adicione contatos à lista.

1. **Configurar SMTP** — Vá em Sistema > SMTP. Insira as credenciais do seu servidor de e-mail.

1. **Criar campanha** — Vá em Marketing > Campanhas > Nova campanha. Siga o wizard de 6 passos.

1. **Verificar logs** — Vá em Sistema > Auditoria para ver o histórico de operações.

---

## 7. Solução de Problemas

### Erro: "Cannot connect to Xano"

- Verifique se a URL `XANO_API_BASE_URL` no `.env` está correta

- Verifique se os endpoints do Xano estão publicados (não em modo rascunho )

- Teste a URL no navegador: `https://SEU-WORKSPACE.xano.io/api:GRUPO/auth/me`

### Erro: "CORS blocked"

- No Xano, vá em Settings > API > CORS e adicione `http://localhost:3000` como origem permitida

### Erro: "Authentication failed"

- Verifique se o `JWT_SECRET` no `.env` é o mesmo usado para gerar os tokens

- Verifique se o endpoint `/auth/me` do Xano está retornando os campos corretos

### Erro: "SMTP connection failed"

- Verifique as credenciais SMTP na página de configurações

- Se usar Gmail, habilite "Senhas de app" em myaccount.google.com

- Se usar Brevo/SendGrid, use as credenciais SMTP fornecidas por eles

### Portas em uso

- Se a porta 3000 estiver ocupada, altere `PORT=3001` no `.env`

---

## Resumo da Arquitetura

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend (React  )  │────▶│  Backend (Node)  │────▶│    Xano     │
│   localhost:3000    │     │  Express + tRPC   │     │  (API REST) │
│   Tailwind CSS      │     │  Nodemailer       │     │  (Database) │
└─────────────────────┘     └──────────────────┘     └─────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │  SMTP Server │
                            │  (Gmail, etc)│
                            └──────────────┘
```

O frontend se comunica com o backend via tRPC. O backend faz chamadas REST para o Xano (banco de dados) e usa Nodemailer para envio de e-mails via SMTP. A autenticação é feita localmente com JWT, sem dependência de serviços externos.

