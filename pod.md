# pod.md — Plano de Desenvolvimento (OpenCode Quiz)

> **Status:** v1.1 — 2026-10-19 — plano da fase de **Desenvolvimento** + **snapshot da implementação**.
> **Base:** `prd.md` **v1.2** (D1–D65), `SECURITY.md` e `AGENTS.md` (só nas partes que não conflitam).
> **Precedência:** `SECURITY.md` > `prd.md` > `pod.md` > `AGENTS.md`.
> **Regra:** nenhuma decisão deste plano amplia o escopo do `prd.md`; decisões técnicas são registradas em **PD1–PD45** (§15).
>
> **Como ler este documento:** §1–§13 continuam sendo o desenho aprovado; §14 (fases), §15 (PD) e §19–§20 registram o que **já foi implementado** e o que falta. O trabalho restante, em ordem de prioridade e sem repetir o que está pronto, está em **`pod_v2.md`**.
>
> **Resumo executivo:** o código está escrito e compila (`typecheck`, `lint` e `build` passam). O projeto Supabase **dev** está migrado e semeado (5/5 migrations, 200 questões) e a **auditoria de RLS/grants passou** em 2026-10-20. Continuam **pendentes de verificação** o fluxo manual de auth/quiz/resumo/ranking (com o BUG-002 aberto), a acessibilidade/performance e o deploy (§12.1, §19).

## 0. Decisões fechadas nesta etapa

| Tema | Decisão |
| --- | --- |
| Base do produto | **`prd.md` v1.2, com autenticação** (e-mail + senha). As decisões D66–D70 de um rascunho anterior sem login **não são adotadas** neste plano. |
| Gerenciador de pacotes | **npm** (Node 22 LTS), lockfile `package-lock.json` versionado. |
| Testes automatizados | **Não haverá** suíte automatizada nesta implementação (Vitest/Playwright). Verificação = `tsc`, ESLint, `next build`, checklist manual e consultas SQL de segurança. |
| Auth | Supabase Auth **e-mail + senha**; sem OAuth/magic link; recuperação de senha incluída; confirmação de e-mail desligada em dev e ligada em produção (D45). |
| Dados | Supabase Postgres; **RLS deny-all** em todas as tabelas; acesso somente por RPC `security definer`. |
| Deploy | Vercel (`*.vercel.app`) + Supabase; sem domínio próprio (D64). |

### 0.1 Documentos alinhados

`AGENTS.md` e a skill `frontend-design` foram alinhados à v1.2/autenticação em **2026-10-19**. `prd.md` e `SECURITY.md` não mudam. A referência de rotas de UI é `pod.md` §9.

## 1. Escopo e fora de escopo

**No escopo (RF1–RF16):** cadastro/login/recuperação, quiz de 10 questões, timer de 20 s, feedback, resumo, ranking, banco de 200 questões, deploy.

**Fora de escopo:** painel admin (D33), OAuth/magic link (D25), exclusão de conta (D47), tela de histórico, edição de perfil, temas, animações/ilustrações extras, bibliotecas de UI/animação, testes automatizados.

## 2. Stack e versões

| Camada | Escolha | Observação |
| --- | --- | --- |
| Runtime | **Node.js 22 LTS** | `.nvmrc` com `22`; `engines.node` no `package.json`. |
| Pacotes | **npm 10+** | `package-lock.json` commitado. |
| Framework | **Next.js (App Router) + React + TypeScript strict** | Última versão **estável** no scaffold; sem canary/beta. Versões exatas ficam no lockfile. |
| Estilo | **Tailwind CSS v4** | Tokens em `src/app/globals.css` via `@theme`; sem CSS-in-JS. |
| Lint | **ESLint 9 + `eslint-config-next`** | Flat config (`eslint.config.mjs`). |
| Dados/Auth | **Supabase** (`@supabase/supabase-js` v2, `@supabase/ssr`) | Postgres + Auth; sem Realtime/Storage. |
| Validação | **Zod** | Schemas compartilhados nas rotas e scripts. |
| Fontes | **Sora** (UI) e **JetBrains Mono** (timer/placar) | `next/font/google`; self-hosted no build. |
| Ícones | SVG inline | Sem biblioteca de ícones. |
| Testes | — | Decisão explícita (§12). |

**Política de versões:** usar a última estável de cada major no momento do scaffold; registrar as versões exatas no `package-lock.json` e no `README.md`. Não atualizar majors durante a fase sem necessidade.

## 3. Estrutura do repositório

```text
.
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                      # home
│  │  ├─ globals.css
│  │  ├─ login/page.tsx
│  │  ├─ cadastro/page.tsx
│  │  ├─ recuperar-senha/page.tsx
│  │  ├─ redefinir-senha/page.tsx
│  │  ├─ quiz/page.tsx
│  │  ├─ resumo/page.tsx
│  │  ├─ ranking/page.tsx
│  │  ├─ auth/callback/route.ts
│  │  └─ api/
│  │     ├─ quiz/start/route.ts
│  │     ├─ quiz/answer/route.ts
│  │     ├─ quiz/advance/route.ts
│  │     ├─ quiz/summary/route.ts
│  │     ├─ ranking/route.ts
│  │     └─ nickname/route.ts
│  ├─ components/
│  │  ├─ ui/                          # GlassCard, Button, TextField, OptionButton, Timer, Feedback, RankingTable
│  │  ├─ auth/                        # LoginForm, SignupForm, RecoveryForm, ResetForm, LogoutButton
│  │  └─ quiz/                        # QuizRunner, QuestionCard, FeedbackPanel, SummaryList
│  ├─ lib/
│  │  ├─ supabase/{server,client}.ts
│  │  ├─ quiz/{rules,payloads,errors}.ts
│  │  ├─ validation/schemas.ts
│  │  ├─ auth/guards.ts
│  │  └─ env.ts
│  └─ middleware.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 20261019000100_schema.sql
│  │  ├─ 20261019000200_functions.sql
│  │  ├─ 20261019000300_rls.sql
│  │  └─ 20261019000400_catalog.sql
│  └─ seed/questions.json
├─ scripts/
│  ├─ seed.ts
│  ├─ seed-dev-users.ts
│  └─ verify-security.sql
├─ .env.example
├─ .gitignore
├─ next.config.ts
├─ eslint.config.mjs
├─ tsconfig.json
├─ package.json
└─ README.md
```

- `src/lib/supabase/server.ts` usa **anon key + cookies** (`@supabase/ssr`). **Nunca** importa service role.
- `scripts/*` rodam **localmente** com service role, fora do runtime da aplicação.
- Sem pasta `src/lib/supabase/admin.ts`; o service role não existe no bundle.

> **Estrutura real implementada:** a árvore acima é o **alvo** aprovado. A implementação difere em nomes e na quantidade de arquivos (sem `middleware.ts`, `validation/schemas.ts`, `quiz/rules.ts`, `quiz/payloads.ts`, `auth/guards.ts`; com `src/proxy.ts`, `src/lib/validation.ts`, `src/lib/quiz/{types,errors}.ts`, `src/lib/auth/{viewer,redirect}.ts`, `src/app/error.tsx` e uma quinta migration). A árvore real está em **§19**.

## 4. Modelo de dados

### 4.1 Visão geral

```text
auth.users 1─1 profiles
auth.users 1─N quiz_sessions 1─N session_questions 1─N session_options
questions N─1 levels / subjects
questions 1─N question_options
auth.users 1─N question_views N─1 questions
```

**Histórico** = todas as linhas de `quiz_sessions` (D30). **Ranking** = melhor sessão `completed` por usuário.

### 4.2 Tabelas

**`profiles`** — apelido público, sem e-mail.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | `references auth.users(id) on delete cascade` |
| `nickname` | `text` | 3–20 caracteres, sem caracteres de controle |
| `normalized_nickname` | `text` unique | `lower()` + espaços colapsados |
| `created_at` | `timestamptz` | default `now()` |

**`levels`** — 5 níveis fixos (1 fácil … 5 expert).

| Coluna | Tipo |
| --- | --- |
| `id` | `smallint` PK (1–5) |
| `slug` | `text` unique |
| `name_pt` | `text` |
| `sort_order` | `smallint` unique |

**`subjects`** — 3 assuntos (D20).

| Coluna | Tipo |
| --- | --- |
| `id` | `smallint` identity PK |
| `slug` | `text` unique |
| `name_pt` | `text` |
| `sort_order` | `smallint` unique |

**`questions`** — banco de 200 (D59).

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `external_id` | `text` unique | ex.: `FUND-F1-001`; chave do seed |
| `level_id` | `smallint` | FK `levels` |
| `subject_id` | `smallint` | FK `subjects` |
| `prompt` | `text` | 1–500 caracteres |
| `explanation` | `text` | 1–1000 caracteres; obrigatória |
| `is_active` | `boolean` | default `true`; seed desativa, nunca apaga |
| `created_at` / `updated_at` | `timestamptz` | default `now()` |

**`question_options`** — 9 por questão (1 correta + 8 erradas).

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `question_id` | `uuid` | FK `questions` `on delete cascade` |
| `body` | `text` | 1–300 caracteres |
| `is_correct` | `boolean` | exatamente 1 por questão |
| `position` | `smallint` | 1–9, unique por questão |

Índices/constraints:

```sql
create unique index question_options_one_correct
  on public.question_options(question_id) where is_correct;
create unique index question_options_position
  on public.question_options(question_id, position);
```

Constraint trigger **deferrable initially deferred** `assert_question_shape()`: ao final da transação, cada questão precisa ter **9 opções** e **exatamente 1 correta**. Isso permite inserir as 9 opções em sequência no seed.

**`quiz_sessions`** — uma sessão de quiz.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK `auth.users` `on delete cascade` |
| `status` | `text` | `in_progress` / `completed` / `abandoned` |
| `started_at` | `timestamptz` | default `now()` |
| `last_activity_at` | `timestamptz` | default `now()`; TTL de 2 h |
| `completed_at` | `timestamptz` | preenchido em `completed`/`abandoned` |
| `score` | `smallint` | 0–10; calculado na conclusão |

```sql
create unique index quiz_sessions_one_in_progress
  on public.quiz_sessions(user_id) where status = 'in_progress';
create index quiz_sessions_user_started
  on public.quiz_sessions(user_id, started_at desc);
```

**`session_questions`** — as 10 questões sorteadas, com **snapshot** do texto.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `session_id` | `uuid` | FK `quiz_sessions` `on delete cascade` |
| `position` | `smallint` | 1–10 |
| `question_id` | `uuid` | FK `questions` |
| `level_id` / `subject_id` | `smallint` | snapshot |
| `prompt` / `explanation` | `text` | snapshot no início da sessão |
| `presented_at` | `timestamptz` | quando a questão foi exibida |
| `answered_at` | `timestamptz` | resposta ou timeout |
| `selected_label` | `char(1)` | `A`–`D` ou `null` |
| `is_correct` | `boolean` | `null` até responder |
| `timed_out` | `boolean` | default `false` |

```sql
unique (session_id, position);
unique (session_id, question_id);
```

**`session_options`** — as 4 alternativas exibidas, com **snapshot** do texto e do gabarito.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `session_question_id` | `uuid` | FK `session_questions` `on delete cascade` |
| `option_id` | `uuid` | FK `question_options` `on delete set null` (rastreabilidade) |
| `body` | `text` | snapshot |
| `label` | `char(1)` | `A`–`D` pela ordem exibida |
| `position` | `smallint` | 1–4 |
| `is_correct` | `boolean` | exatamente 1 por questão de sessão |

```sql
create unique index session_options_one_correct
  on public.session_options(session_question_id) where is_correct;
unique (session_question_id, label);
unique (session_question_id, position);
```

> O snapshot garante que o resumo mostre exatamente o que foi perguntado, mesmo que o banco seja corrigido depois.

**`question_views`** — controle de repetição por usuário/nível (D60).

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `user_id` | `uuid` | FK `auth.users` `on delete cascade` |
| `question_id` | `uuid` | FK `questions` `on delete cascade` |
| `level_id` | `smallint` | FK `levels` |
| `first_seen_at` | `timestamptz` | default `now()` |

```sql
primary key (user_id, question_id);
create index question_views_user_level on public.question_views(user_id, level_id);
```

- Ao esgotar um nível (**40 questões vistas**), as linhas daquele `(user_id, level_id)` são **apagadas** e o ciclo recomeça (D60).
- Repetição só é permitida quando restam menos de 2 questões não vistas no nível (§7.1).

### 4.3 Invariantes

1. Exatamente **200 questões ativas**, **40 por nível**, **~13/13/14 por assunto em cada nível** (D36/D59).
2. Cada questão tem **9 opções** e **1 correta**; cada sessão exibe **4** (1 correta + 3 erradas).
3. Toda sessão tem **10 questões**, **2 por nível**, em ordem crescente de nível; dentro do nível, ordem aleatória (D37).
4. Sessão concluída tem `score` = quantidade de `is_correct = true` (0–10).
5. Sessão abandonada tem `score` = acertos até o momento; não respondidas contam como erro e **não** entram no ranking (D56).
6. Um usuário tem **no máximo 1 sessão `in_progress`**.
7. O sorteio (questões, 3 erradas, ordem A–D) é fixado no início e **nunca muda** (D57).
8. Nenhuma tabela do quiz é legível diretamente pelo cliente (§5).

## 5. Segurança, RLS e privilégios

### 5.1 Regras gerais

- **RLS habilitado em todas as tabelas** com **nenhuma policy** para `anon`/`authenticated` (deny-all).
- `revoke all on all tables in schema public from anon, authenticated;` e `revoke all on all sequences ...`.
- Todo acesso a dados passa por **RPC `security definer`**; apenas as RPCs públicas recebem `grant execute`.
- Toda função `security definer` usa `set search_path = ''` e nomes totalmente qualificados (`public.*`, `auth.uid()`, `pg_catalog.now()`).
- O runtime usa **somente anon key + JWT do usuário**; a **service role** só existe em `scripts/` executados localmente (migrations/seed). Ela **não** é configurada na Vercel.
- O gabarito (`question_options.is_correct`, `session_options.is_correct`) **nunca** é selecionado em payload de pergunta; só aparece no feedback/resumo depois da resposta.
- Nenhum e-mail é retornado por RPC pública ou de ranking; o ranking expõe apenas `nickname`.
- Sem concatenação de SQL: `supabase-js` parametrizado e `format`/parâmetros nas funções.
- Erros ao usuário são genéricos (código + mensagem pt-BR); logs do servidor não contêm e-mail, token ou gabarito.

### 5.2 Autenticação

- **Supabase Auth** e-mail + senha; mínimo 8 caracteres (D44); sem OAuth/magic link (D25).
- **Dev:** confirmação de e-mail desabilitada (D45). **Produção:** confirmação habilitada antes do deploy.
- Recuperação de senha via `resetPasswordForEmail` + rota `/auth/callback` + tela `/redefinir-senha`.
- `@supabase/ssr`: `SameSite=Lax`; `Secure` definido explicitamente em produção (`cookieOptions.secure` no client browser, no server e no proxy). **Desvio conhecido (PD43):** os cookies de auth do `@supabase/ssr` são `httpOnly: false` porque o client browser precisa lê-los; `HttpOnly` quebraria o fluxo atual. O cookie de quiz `oq_quiz_session` **é** `HttpOnly`. Não declarar conformidade total com `HttpOnly` até a revisão de segurança (`pod_v2.md`).
- O proxy renova a sessão e protege `/quiz` e `/resumo`; o matcher **exclui** `/api/*` e `/auth/callback` (esses handlers renovam a sessão por conta própria).
- `getUser()` (não `getSession()`) é a checagem de identidade em rotas/server components.
- Apelido criado por trigger em `auth.users` a partir de `raw_user_meta_data.nickname`; validação repetida no banco. Apelido é **único** (normalizado) e **imutável** nesta versão.
- `next` de redirect só aceita caminho interno (`/...`), nunca URL absoluta.
- Login/cadastro usam o client browser do Supabase; não há rota própria que manipule senha.

### 5.3 Matriz de acesso

| Objeto | `anon` | `authenticated` | RPC |
| --- | --- | --- | --- |
| `questions`, `question_options` | negado | negado | leitura só via sessão |
| `quiz_sessions`, `session_questions`, `session_options` | negado | negado | dono via `auth.uid()` |
| `profiles` | negado | negado | ranking/meu perfil |
| `question_views` | negado | negado | interno |
| `rpc_check_nickname`, `rpc_public_ranking` | execute | execute | público |
| `rpc_start_session`, `rpc_submit_answer`, `rpc_advance`, `rpc_get_summary`, `rpc_my_profile` | negado | execute | autenticado |

### 5.4 Headers e CSRF

- `POST` das rotas de quiz valida `Origin` contra `NEXT_PUBLIC_SITE_URL` (e `http://localhost:3000` em dev); cookies `SameSite=Lax`.
- Headers em `next.config.ts`: `Content-Security-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Permissions-Policy` mínima.
- CSP de produção: `default-src 'self'`; `connect-src 'self' https://*.supabase.co`; `img-src 'self' data:`; `font-src 'self'`; `style-src 'self' 'unsafe-inline'`; `script-src 'self' 'unsafe-inline'` (sem `unsafe-eval` em produção). Ajustar somente se o build do Next exigir.
- HSTS só em produção (Vercel).

## 6. RPCs (contrato do backend)

Todas as funções ficam em `public`, são `security definer` e têm `execute` revogado de `public`; os grants são explícitos.

### 6.1 `rpc_check_nickname(p_nickname text)` — público

Retorna `{ valid: boolean, available: boolean, normalized: string }`. Valida 3–20 caracteres, sem controle; normaliza com `normalize_nickname()`. Não reserva o apelido.

### 6.2 `rpc_start_session()` — autenticado

1. Exige `auth.uid()`.
2. `pg_advisory_xact_lock` por usuário (serializa starts concorrentes).
3. Limite: **20 starts por usuário por hora** (`RATE_LIMITED`).
4. Abandona a sessão `in_progress` existente (se houver), calculando o placar dos acertos.
5. Sorteia 10 questões (§7.1), grava snapshots e registra views.
6. Cria a sessão e apresenta a questão 1 (`presented_at = now()`).
7. Retorna `{ sessionId, question }`.

**Pergunta (payload):**

```json
{
  "sessionQuestionId": "uuid",
  "position": 1,
  "total": 10,
  "prompt": "…",
  "options": [
    { "label": "A", "body": "…" },
    { "label": "B", "body": "…" },
    { "label": "C", "body": "…" },
    { "label": "D", "body": "…" }
  ],
  "deadlineAt": "2026-10-19T18:00:20.000Z",
  "serverNow": "2026-10-19T18:00:00.000Z"
}
```

Sem `question_id`, sem `is_correct`, sem explicação antes da resposta.

### 6.3 `rpc_submit_answer(p_session_question_id uuid, p_label char)` — autenticado

- Sessão = `in_progress` do `auth.uid()`; se não existir → `SESSION_CLOSED`.
- Se `last_activity_at < now() - 2h` → abandona e retorna `SESSION_CLOSED`.
- **Implementação (PD36):** esses dois caminhos retornam um **sentinela JSON** (`{ state: "error", code: "SESSION_CLOSED" }`) em vez de `raise exception`, porque a exceção faria rollback do `abandon_session` na mesma transação. A rota traduz o sentinela via `rpcPayloadError()`. O mesmo vale para `rpc_advance`.
- A questão precisa ser a **primeira não respondida** (`position = count(answered)+1`); senão `QUESTION_OPEN`.
- Se `now() > presented_at + 20s`: marca `timed_out = true`, `is_correct = false`, `answered_at = now()`, ignora a alternativa e retorna feedback de tempo esgotado (RF15).
- Se já respondida: mesma label → devolve o mesmo feedback (idempotente); label diferente → `ALREADY_ANSWERED`.
- Valida `p_label` em `session_options` daquela questão; grava `selected_label` e `is_correct`.
- Atualiza `last_activity_at` e retorna o feedback com `score` parcial.

**Feedback:**

```json
{
  "state": "feedback",
  "position": 1,
  "isCorrect": true,
  "timedOut": false,
  "selectedLabel": "B",
  "correctOption": { "label": "C", "body": "…" },
  "explanation": "…",
  "score": 1
}
```

### 6.4 `rpc_advance()` — autenticado

- Sessão `in_progress` do usuário; TTL de 2 h igual ao submit.
- `v_next = count(answered) + 1`.
- `v_next > 10` → conclui a sessão (`completed`, `completed_at`, `score`) e retorna `{ state: "summary", summary }`.
- Questão `v_next` ainda não apresentada → define `presented_at = now()` e retorna `{ state: "question", question }`.
- Questão apresentada e não respondida:
  - tempo esgotado → marca timeout e retorna `{ state: "feedback", ... }`; a próxima chamada avança;
  - tempo restante → `QUESTION_OPEN` (o cliente não pode pular).
- Depois do feedback da 10ª, a próxima chamada conclui e devolve o resumo.

### 6.5 `rpc_get_summary(p_session_id uuid)` — autenticado

- Exige que a sessão pertença ao `auth.uid()`; senão `SESSION_NOT_FOUND`.
- Sessão `in_progress` com mais de 2 h é abandonada antes da checagem; se ainda estiver aberta → `SESSION_OPEN`.
- Retorna o resumo de sessão `completed` ou `abandoned` (não rankeada).

```json
{
  "sessionId": "uuid",
  "status": "completed",
  "ranked": true,
  "score": 7,
  "total": 10,
  "completedAt": "…",
  "items": [
    {
      "position": 1,
      "prompt": "…",
      "options": [{ "label": "A", "body": "…" }],
      "selectedLabel": "B",
      "correctLabel": "C",
      "explanation": "…",
      "answered": true,
      "isCorrect": false,
      "timedOut": false
    }
  ]
}
```

- `items[].answered` distingue questão **não respondida** (sessão abandonada) de erro/timeout; a UI mostra “Não respondida” (PD37).

### 6.6 `rpc_public_ranking()` — público

Retorna `{ top: [...], me: {...} | null }`:

- Uma linha por usuário, usando a **melhor** sessão `completed`.
- Ordenação: `score desc`, `completed_at asc`, `normalized_nickname asc` (D32/D54).
- `top` = 10 primeiras; `me` = posição do usuário logado, mesmo fora do top 10.
- Sem e-mail; apenas `position`, `nickname`, `score`, `achievedAt`.

### 6.7 Funções internas (sem grant)

`normalize_nickname`, `handle_new_user` (trigger), `abandon_session`, `complete_session`, `select_session_questions`, `build_question_payload`, `build_feedback`, `build_summary`, `sweep_stale_session`.

## 7. Motor do quiz — regras de implementação

### 7.1 Seleção das 10 questões

**Prioridade:** (1) 2 por nível; (2) evitar repetição (D31/D60); (3) equilíbrio de assuntos 3/3/4 (D27).

Para cada nível 1–5:

1. `unseen` = questões ativas do nível sem linha em `question_views` para o usuário.
2. `unseen >= 2`: sorteia 2.
3. `unseen == 1`: usa a 1 não vista + 1 sorteada entre as vistas do nível.
4. `unseen == 0` (40 vistas): apaga as views do `(user, nível)` e sorteia 2 entre todas as 40.
5. Se o nível tiver menos de 2 questões ativas → `BANK_INCOMPLETE` (não deve ocorrer).

**Equilíbrio de assuntos:** após escolher as 10, se algum assunto ficar com **5+** ou **2−**, tenta trocas por questões não selecionadas do **mesmo nível**, preferindo não vistas e assuntos sub-representados. Se não houver troca possível, mantém a seleção (as prioridades 1 e 2 vencem). O alvo é uma distribuição **3/3/4**.

**Ordem:** níveis crescentes (2 por nível); dentro do nível, ordem aleatória (D37). Posições 1–10.

**Persistência:** gravar `session_questions` + `session_options` (snapshots) e inserir as views das questões escolhidas que ainda não tinham view (`on conflict do nothing`). O sorteio não é recalculado em nenhuma leitura (D57).

### 7.2 Alternativas

- Correta + 3 erradas sorteadas das 8 (D9/D11).
- Embaralhar as 4; rótulos **A–D** pela ordem exibida (A3).
- Exatamente 4 em `session_options`; 1 correta.
- O cliente recebe apenas `label` + `body`.

### 7.3 Timer

- `deadline = presented_at + 20 s`.
- O servidor compara `now()` com o deadline; **sem tolerância**. Resposta após 20 s é erro, mesmo que o cliente mostre tempo restante (RF15/D58).
- O cliente calcula o restante com `deadlineAt` e `serverNow` (offset), não com o relógio local isolado.
- Ao chegar a zero, o cliente chama `rpc_advance()`; se o servidor ainda considerar tempo restante, a rota devolve `QUESTION_OPEN` e o cliente tenta de novo após ~250 ms (máx. 2 tentativas).
- O intervalo de feedback/explicação **não é cronometrado** (D28); `presented_at` da próxima só é definido no `advance`.
- Exibição: número + barra; `role="timer"`; sem `aria-live` por segundo; anunciar “Tempo esgotado” uma vez em `role="status"`.

### 7.4 Ciclo de vida da sessão

```text
start ──► in_progress ──(10ª + advance)──► completed (rankeada)
              │
              ├─(novo start)──► abandoned (não rankeada)
              └─(TTL 2 h, no próximo acesso)──► abandoned
```

- **Sem retomada** (RF16/D53): recarregar `/quiz` inicia uma sessão nova; a anterior é abandonada.
- Cada usuário tem no máximo uma `in_progress`; o índice parcial garante isso. `start` usa advisory lock para evitar corrida.
- A sessão abandonada tem `completed_at` preenchido, `score` = acertos e **não** entra no ranking (D56).
- Não há cron: o abandono por TTL é **lazy**, na próxima chamada do usuário. Sessões antigas de usuários que nunca voltam ficam `in_progress`, mas não afetam ranking nem bloqueiam ninguém.
- Logout/navegação para fora não conclui a sessão; ela será abandonada no próximo `start` ou por TTL.

### 7.5 Placar e ranking

- Placar = acertos (0–10); começa em 0 (RF8).
- Feedback imediato soma 1 quando correto (D4).
- Ranking considera somente `status = 'completed'`; melhor `score` por usuário.
- Empate: `completed_at` mais antigo; persistindo, `normalized_nickname` alfabético (D32/D54).
- O ranking é recalculado na leitura (sem materialized view; volume é pequeno).
- Top 10 + posição do usuário logado (D41); visitante vê só o top 10.

### 7.6 Apelido

- 3–20 caracteres após `trim`; espaços internos colapsados; sem caracteres de controle.
- Exibição = texto como digitado (trim); unicidade = `lower()` normalizado.
- Único e imutável nesta versão; não há tela de edição de perfil.
- Pré-checagem `rpc_check_nickname` para UX; o trigger do banco revalida (corrida → erro genérico no cadastro).

## 8. API HTTP (Route Handlers)

Todas as rotas são **same-origin**, JSON, `Cache-Control: no-store`; validam entrada com Zod.

| Rota | Método | Acesso | Função |
| --- | --- | --- | --- |
| `/api/quiz/start` | POST | autenticado | inicia/abandona e devolve a 1ª questão; define cookie `oq_quiz_session` |
| `/api/quiz/answer` | POST | autenticado | `{ sessionQuestionId, label }` → feedback |
| `/api/quiz/advance` | POST | autenticado | próxima questão, feedback de timeout ou resumo |
| `/api/quiz/summary` | GET | autenticado | resumo da sessão do cookie |
| `/api/ranking` | GET | público | top 10 + posição do usuário |
| `/api/nickname` | GET | público | disponibilidade do apelido |
| `/auth/callback` | GET | público | troca código por sessão (confirmação/recuperação) |

**Cookie da sessão de quiz:** `oq_quiz_session` = UUID da sessão; `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em produção, `Max-Age=14400` (4 h). Não é segredo (a posse é validada no banco), mas não vai em URL nem em log.

**Erros:**

| Código | HTTP | Quando |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | sem usuário |
| `INVALID_INPUT` | 400 | Zod/falha de formato |
| `RATE_LIMITED` | 429 | 20 starts/hora |
| `SESSION_CLOSED` | 409 | sessão abandonada/concluída (também via sentinela JSON de `rpc_submit_answer`/`rpc_advance`, PD36) |
| `SESSION_NOT_FOUND` | 404 | sessão de outro usuário/inexistente |
| `SESSION_OPEN` | 409 | resumo de sessão em andamento |
| `QUESTION_OPEN` | 409 | tentou avançar sem responder |
| `ALREADY_ANSWERED` | 409 | resposta divergente na mesma questão |
| `BANK_INCOMPLETE` | 500 | banco inválido (não esperado) |
| `INTERNAL` | 500 | falha inesperada |

Mensagens em pt-BR, sem detalhe interno. As rotas chamam `.rpc()` com a sessão do usuário; nenhuma rota usa service role.

## 9. Telas e fluxos (UI)

O visual segue a skill **`frontend-design`** (glass azul + lilás, Sora/JetBrains Mono, tokens, acessibilidade), já com as telas de autenticação. A referência de rotas é `pod.md` §9.

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| `/` | público | título curto, explicação de 1 linha, 3 assuntos, “Começar quiz” (visitante → login; logado → quiz) e “Ver ranking”; se logado, “Sair” |
| `/login` | público | e-mail, senha, “Entrar”, links “Criar conta” e “Esqueci minha senha” |
| `/cadastro` | público | e-mail, apelido, senha (mín. 8), “Criar conta”; aviso de apelido público e único; se confirmação ligada, estado “Confirme seu e-mail” |
| `/recuperar-senha` | público | e-mail + “Enviar link”; mensagem genérica de envio |
| `/redefinir-senha` | sessão de recuperação | nova senha (um campo, mín. 8) + “Salvar nova senha” |
| `/quiz` | autenticado | progresso “Questão X de 10”, timer, enunciado, 4 opções (2×2 / 1 coluna), feedback, “Próxima” |
| `/resumo` | autenticado | placar, itens em `<details>` com sua resposta, correta e explicação; “Jogar de novo” e “Ver ranking” |
| `/ranking` | público | tabela no desktop, linhas empilhadas no mobile; destaca só o usuário atual |

**Estados do quiz:** `loading` → `question` → `feedback` → `question` … → `summary`; erro recuperável mostra painel com “Tentar de novo” (D49).

**Regras de UI:**

- `QuizRunner` inicia a sessão **uma vez por montagem** (ref guard), por causa do StrictMode em dev.
- Opções são `<button>` reais; desabilitam após responder; acerto/erro usam ícone + texto, nunca só cor.
- Opções em **1 coluna no mobile e 2×2** a partir de `sm` (PD38).
- `/ranking` e `/resumo` têm estado de erro amigável com “Tentar novamente” (recarrega a rota); `src/app/error.tsx` cobre falhas não tratadas (PD39).
- Rótulos de seção em **sentence case** (sem `uppercase`), exceto o cabeçalho da tabela de ranking; os marcadores decorativos `01/02/03` da home foram removidos (PD40).
- `INVALID_INPUT`/`INVALID_NICKNAME` respondem **400** (não 409) (PD41).
- Timer pausa no feedback; barra + número com `tabular-nums`.
- Feedback em `role="status"` com espaço reservado (sem layout shift).
- Loading = skeleton no mesmo tamanho do painel; sem spinner de página inteira.
- Resumo só busca o cookie `oq_quiz_session`; sem cookie/erro → home.
- “Jogar de novo” inicia nova sessão e substitui o cookie.
- Header: marca, “Ranking”, “Entrar”/“Sair”. Logout via `supabase.auth.signOut()` e `router.refresh()`.
- Todos os textos em **pt-BR** (A7), sentence case, sem emojis.
- Telas de auth reutilizam `GlassCard` 420 px; foco visível de 2 px; contraste ≥ 4,5:1.
- Responsivo em 360/768/1280 px; Lighthouse a11y ≥ 90 nas telas principais (D63).

**Fluxo de navegação:**

```text
/ ──► /login ──► /quiz ──► /resumo ──► /ranking
 │        │                    │
 │        └──► /cadastro       └──► /quiz (novo)
 └──► /ranking (público)
```

`next` interno é preservado após login (ex.: `/login?next=/quiz`).

## 10. Seed das 200 questões

**Formato:** `supabase/seed/questions.json`.

```json
{
  "meta": {
    "version": 1,
    "reviewed_by": "Nome do revisor",
    "reviewed_at": "2026-10-20",
    "source": "documentação oficial do OpenCode"
  },
  "questions": [
    {
      "externalId": "FUND-F1-001",
      "level": "facil",
      "subject": "fundamentos",
      "prompt": "…",
      "explanation": "…",
      "options": [
        { "body": "…", "correct": true },
        { "body": "…", "correct": false }
      ]
    }
  ]
}
```

**Validação obrigatória (`scripts/seed.ts`, falha fechada):**

- 200 questões; **40 por nível**; por nível, **13/13/14** entre os 3 assuntos (D36).
- 1 correta + **8 erradas** por questão; nenhuma duplicada; enunciados únicos (hash normalizado).
- `external_id` único e estável (`{ASSUNTO}-F{nível}-{NNN}`).
- Explicação obrigatória, 1–3 frases, pt-BR, sem dado pessoal/segredo.
- `meta.reviewed_by` preenchido para seed de **produção**; o script recusa placeholder. A revisão humana é um gate (D26); o agente não autoaprova.

**Idempotência:** upsert por `external_id`; opções são substituídas em transação; questões removidas do JSON ficam `is_active = false` (nunca `delete`, para preservar histórico). Sessões antigas usam snapshots.

**Usuários de teste (D25):** `scripts/seed-dev-users.ts` cria 2 usuários fictícios via service role com `email_confirm: true`, **somente** quando `SEED_ENV=dev` e fora da Vercel; senhas aleatórias impressas uma vez no console. Produção: **somente questões**, nenhum usuário fictício (D56).

## 11. Migrações, ambientes e configuração

**Ordem das migrations:**

1. `schema` — tabelas, constraints, índices, trigger de forma das opções.
2. `functions` — normalização, trigger de `auth.users`, RPCs públicas/internas.
3. `rls` — `enable row level security`, revokes e grants.
4. `catalog` — 5 níveis e 3 assuntos fixos (nomes de exibição conforme `prd.md`; slugs estáveis).
5. `seed_helpers` — helpers transacionais usados pelo seed (service role; presentes na implementação, PD42).

**Fluxo:**

```bash
npm install
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npm run seed -- --env=dev
npm run dev
```

- Supabase CLI + projeto **hosted de dev**; Docker/local DB é opcional, não requisito.
- Sem alteração de schema fora de `supabase/migrations` (D52).
- `supabase/config.toml` versionado (inclui `minimum_password_length = 8` no bloco `[auth]`); `.temp` ignorado.
- Scripts de seed executados com **`tsx`** (devDependency), nunca no bundle do app.

**Scripts npm:**

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "seed": "tsx scripts/seed.ts",
  "seed:dev-users": "tsx scripts/seed-dev-users.ts"
}
```

**Variáveis (`.env.example`):**

| Variável | Onde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | app | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | chave pública |
| `NEXT_PUBLIC_SITE_URL` | app | redirects/CSRF (`http://localhost:3000` em dev) |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts locais | migrations/seed; **nunca** na Vercel |
| `SEED_ENV` | scripts | `dev` para permitir usuários fictícios |

- `.env.local` não versionado; `.env.example` só com placeholders.
- `git init` + `.gitignore` (`node_modules`, `.next`, `.env*.local`, `supabase/.temp`).
- Sem CI própria nesta fase: o build da Vercel + comandos locais são o gate.

## 12. Verificação (sem testes automatizados)

**Comandos obrigatórios antes de concluir:**

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
```

**Consultas de segurança (`scripts/verify-security.sql`):**

- RLS habilitado em todas as tabelas e **zero policies**.
- `set role anon; select * from public.question_options;` → negado.
- `set role authenticated; select * from public.quiz_sessions;` → negado.
- `anon` não executa RPCs de sessão; executa apenas ranking/check de apelido.
- Cada questão ativa tem 9 opções e 1 correta; 200 ativas; 40 por nível; 13/13/14 por nível.
- `auth.users` de produção sem usuários fictícios.
- Nenhuma função `security definer` sem `search_path` fixo.

**Checklist manual (obrigatório):**

1. Cadastro, confirmação (dev off), login, logout e recuperação de senha.
2. Apelido inválido/duplicado é rejeitado; apelido válido entra no ranking.
3. Quiz: 10 questões, 2 por nível, 3/3/4 assuntos, 4 opções A–D, 1 correta.
4. Refresh no meio do quiz abandona e inicia nova sessão; abandonada não aparece no ranking.
5. Resposta em ~19 s conta; após 20 s é erro; feedback não é cronometrado.
6. Payload da pergunta não contém gabarito nem `is_correct`; resumo contém.
7. Ranking: 1 linha por usuário, melhor marca, desempates, top 10 + posição.
8. Acessibilidade: teclado completo, foco visível, contraste, `prefers-reduced-motion`; Lighthouse ≥ 90 em home/quiz/resumo/ranking (e nas telas de auth).
9. Performance percebida do start < 300 ms p95 (D62), medida manualmente no DevTools; ranking em 1 requisição HTTP.
10. Erros de Supabase mostram painel amigável + “Tentar de novo” (D49).

**Registro:** relatar apenas o que foi executado, com comando/evidência (SECURITY §4). Não afirmar teste sem execução.

### 12.1 Evidência executada (2026-10-19 e 2026-10-20)

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | passou (`tsc --noEmit`, sem erros) |
| `npm run lint` | passou (`eslint .`, sem avisos) |
| `npm run build` | passou (Next.js 16.4.2; 17 rotas + proxy) |
| `npm run seed -- --dry-run --env=dev` | passou — 200 questões; 40/nível; 13/13/14 por nível |
| `npm run seed -- --dry-run --env=production` | **passou** (exit 0) em 2026-10-20, depois de `meta.reviewed_by = "Roger_Marx"`. Antes disso falhava de propósito — “Seed de produção ainda está pendente de revisão humana” (gate D26, ver BUG-006) |
| `npm run review -- --flags` (2026-10-20) | 200 questões, **0 erros** de rubrica, **12 avisos** (4 “correta longa demais”, 8 “distrator por exclusão”) |
| `scripts/verify-security.sql` (2026-10-20) | **passou** — 9/9 tabelas com RLS, **0** policies, `anon` negado em `question_options`/`quiz_sessions` e nas RPCs de sessão, `authenticated` negado em `session_options`, **17/17** `security definer` com `search_path = ""`, 200 questões ativas, 0 com forma inválida |
| Sondas HTTP com a chave `anon` (2026-10-20) | leitura de todas as tabelas e chamada de todas as RPCs de sessão → **401/42501**; `rpc_public_ranking` e `rpc_check_nickname` → 200 |
| Auth do projeto dev (2026-10-20) | `mailer_autoconfirm = true`, `external.email = true`, `password_min_length = 8`; signup devolve sessão com `email_confirmed_at`; login 200; senha de 7 caracteres → 422 |

**Não executado (pendente):** fluxo manual de auth/quiz/resumo/ranking; Lighthouse/a11y (D63); medição de start (< 300 ms p95, D62); deploy (§13). Já executados desde a primeira versão deste snapshot: `supabase db push` (5/5, 2026-10-19) e `scripts/verify-security.sql` (2026-10-20 — passou; ver `bug_log.md` e `pod_v2.md` P0.2). Ver `pod_v2.md`.

## 13. Deploy

**Supabase (produção):**

1. Criar projeto; rodar migrations via `supabase db push`.
2. Seed somente de questões (`meta.reviewed_by` preenchido); nenhum usuário fictício.
3. Auth: habilitar confirmação de e-mail, Site URL e redirects (`/auth/callback`, `/redefinir-senha`); senha mínima 8; desabilitar provedores não usados.
4. Conferir RLS/grants com `scripts/verify-security.sql`.

**Vercel:**

1. Projeto conectado ao repositório; framework Next.js; Node 22.
2. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. **Sem** service role.
3. Deploy em `*.vercel.app` (D50/D64); sem domínio próprio.
4. Headers/CSP ativos; cookies `Secure`.

**Checklist pós-deploy (D56):**

- [ ] Sessões não editáveis pelo cliente; RLS deny-all; sem policies.
- [ ] `anon`/`authenticated` não leem `question_options` nem `is_correct`.
- [ ] RPCs de sessão exigem `auth.uid()` e negam sessão de outro usuário.
- [ ] Seed de produção sem usuários fictícios.
- [ ] Confirmação de e-mail ligada; recuperação funcionando.
- [ ] Ranking público sem e-mail; 1 requisição HTTP.
- [ ] Lighthouse a11y ≥ 90; fluxo manual completo.
- [ ] Start percebido < 300 ms p95.

**Rollback:** Vercel → redeploy da versão anterior. Banco → migrations são forward-only; correções entram como nova migration (nada destrutivo sem backup).

## 14. Fases de implementação

| Fase | Entrega | Critério de saída | Status (2026-10-20) |
| --- | --- | --- | --- |
| **F0 — Sincronização** | `AGENTS.md` e skill alinhados à v1.2/autenticação | documentos sem contradição sobre login | ✅ concluído |
| **F1 — Scaffold** | Next.js + TS + Tailwind, npm, lint, fontes, tokens, estrutura | `dev`, `typecheck`, `lint`, `build` passam | ✅ concluído — `typecheck`/`lint`/`build` passam |
| **F2 — Banco** | migrations de schema/funções/RLS/catálogo (+ seed helpers) | RPCs e grants aplicados; RLS verificada | 🟡 **aplicado e auditado no dev** (5/5 migrations, 200 questões semeadas, `verify-security.sql` passou em 2026-10-20) |
| **F3 — Auth** | cadastro/login/recuperação, trigger de perfil, proxy, logout | fluxo de auth manual completo | 🟡 código pronto; BUG-001/003/004/005 corrigidos e verificados; **BUG-002 aberto** |
| **F4 — Motor** | `start`, `answer`, `advance`, `summary`, ranking | 10 questões, timer, abandono e ranking corretos | 🟡 código pronto; RPCs **exercitadas** (20 `question_views`; ranking com `dev-ana`/8) |
| **F5 — UI** | home, auth, quiz, resumo, ranking conforme skill | responsivo, acessível, copy pt-BR | 🟡 código pronto; a11y/perf **não medidos** |
| **F6 — Banco de questões** | 200 questões revisadas + seed validado | 40/nível, 13/13/14, 9 opções, revisão humana | ✅ 200 questões sem erro objetivo de rubrica (0 erros, 12 avisos via `npm run review`) e **revisão humana atestada** em 2026-10-20; dry-run de produção exit 0 |
| **F7 — Verificação** | typecheck, lint, build, SQL e checklist manual | evidências registradas; D56 atendido | 🟡 parcial: `typecheck`/`lint`/`build`/review/SQL ✅ (D56 atendido no dev); **checklist manual pendente** |
| **F8 — Deploy** | Supabase + Vercel + checklist | produção validada | ⛔ **não iniciado** |
| **Git/GitHub** | versionamento, remote e higiene de branch | repositório no ar, `main` protegida | ✅ concluído 2026-10-20 (`main`, 3 commits, force-push bloqueado) |

**Dependências:** F2 antes de F3/F4; F6 pode correr em paralelo a F3–F5, mas é o caminho crítico (revisão humana). F5 depende de F3/F4; F8 depende de F7.

**Leitura do status:** “✅ concluído” = verificado; “🟡 pronto no código, não verificado” = implementado e compilando, mas sem execução contra Supabase/ambiente real; “⛔” = não iniciado.

## 15. Decisões da fase de desenvolvimento (PD)

| # | Decisão |
| --- | --- |
| PD1 | Base **`prd.md` v1.2 com autenticação**; D66–D70 (rascunho sem login) não adotadas. |
| PD2 | **npm** + Node 22 LTS; lockfile versionado. |
| PD3 | Última versão **estável** de Next/React/TS/Tailwind no scaffold; versões exatas no lockfile. |
| PD4 | Next.js **App Router** com `src/`; páginas em Server Components; interações em Route Handlers. |
| PD5 | Supabase Auth **e-mail + senha**, recuperação incluída; sem OAuth/magic link (D25). |
| PD6 | Perfil criado por trigger em `auth.users`; apelido **único** (case-insensitive) e imutável; 3–20 caracteres. |
| PD7 | Telas `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`; middleware protege `/quiz` e `/resumo`; logout no header. |
| PD8 | Sem telas de histórico, perfil ou admin; histórico fica armazenado em `quiz_sessions` (D30/D33). |
| PD9 | Modelo de dados do §4, com **snapshots** de enunciado, explicação e alternativas por sessão. |
| PD10 | **RLS deny-all** + RPCs `security definer`; nenhuma leitura direta de tabela pelo cliente. |
| PD11 | Runtime só com anon key/JWT; service role apenas em scripts locais de migration/seed. |
| PD12 | Posse da sessão por `auth.uid()`; cookie `HttpOnly` guarda o ID da sessão para o resumo. |
| PD13 | No máximo **1 sessão `in_progress` por usuário**; novo start abandona a anterior (D53). |
| PD14 | **Sem retomada**; refresh inicia nova sessão; guard de montagem evita start duplo no StrictMode. |
| PD15 | Abandono **lazy** por TTL de 2 h; sem cron/background job. |
| PD16 | Sorteio persistido no início: questões, 3 erradas e ordem A–D imutáveis (D57). |
| PD17 | 1 correta + 3 erradas; A–D pela ordem exibida (A3). |
| PD18 | Timer estrito de 20 s adjudicado no servidor, **sem tolerância**; feedback não cronometrado (D58/D28). |
| PD19 | Evitar repetição por **usuário + nível**; limpa o nível ao atingir 40 vistas; repete só se restarem < 2 não vistas (D60). |
| PD20 | Equilíbrio de assuntos 3/3/4 é **best-effort**; prioridade: nível > não repetir > assuntos (D27). |
| PD21 | Ranking por melhor sessão `completed`; empate por `completed_at` e depois apelido normalizado; top 10 + usuário (D32/D41/D54). |
| PD22 | Placar 0–10; sessão abandonada tem placar parcial e **não** entra no ranking (D56). |
| PD23 | API em Route Handlers com os códigos do §8; `Cache-Control: no-store` no quiz. |
| PD24 | Validação Zod nas rotas; erros genéricos em pt-BR; sem detalhe interno. |
| PD25 | CSRF por `SameSite=Lax` + checagem de `Origin`; CSP/headers no `next.config.ts`. |
| PD26 | Seed JSON com `external_id`, validação fechada e gate de revisão humana (D26). |
| PD27 | Usuários fictícios só em dev (`SEED_ENV=dev`); produção só questões (D25/D56). |
| PD28 | Schema só via `supabase/migrations`; Supabase CLI contra projeto hosted (D52). |
| PD29 | **Sem suíte automatizada**; verificação por `typecheck`, lint, build, SQL e checklist manual (D51). |
| PD30 | Deploy Vercel + Supabase, `*.vercel.app`, sem domínio próprio (D50/D64). |
| PD31 | Limite de 20 starts/usuário/hora; limites de auth ficam com o Supabase. |
| PD32 | E-mails de auth pelo serviço embutido do Supabase; SMTP externo exigiria autorização de host (D23). |
| PD33 | Logs sem e-mail, token ou gabarito; erros internos só com código. |
| PD34 | Metas: start percebido < 300 ms p95; ranking em 1 HTTP; Lighthouse a11y ≥ 90 (D55/D61–D63). |
| PD35 | UI segue a skill `frontend-design`, já com login/cadastro/recuperação no lugar da entrada de nome. |
| PD36 | `SESSION_CLOSED` por TTL/sessão ausente em `rpc_submit_answer`/`rpc_advance` retorna **sentinela JSON** (`{state:"error",code}`) em vez de `raise exception`, para não desfazer o `abandon_session`; a rota traduz com `rpcPayloadError()`. |
| PD37 | `build_summary` inclui `items[].answered`; o resumo mostra “Não respondida” para questão sem resposta (sessão abandonada). |
| PD38 | Alternativas do quiz em 1 coluna no mobile e **2×2** a partir de `sm` (desktop). |
| PD39 | `/ranking` e `/resumo` exibem estado de erro amigável com “Tentar novamente”; `src/app/error.tsx` é o error boundary global (pt-BR, `reset`). |
| PD40 | Removidos rótulos `uppercase`/`tracking-*` das “eyebrows” (sentence case) e os marcadores decorativos `01/02/03` da home; `uppercase` fica só no cabeçalho da tabela de ranking. |
| PD41 | `INVALID_INPUT`/`INVALID_NICKNAME` retornam **HTTP 400** (antes caíam no default 409). |
| PD42 | Catálogo usa nomes de exibição do `prd.md` (Média/Desafiadora/Difícil/Expert; Features e Produtividade; Boas práticas de uso) mantendo **slugs estáveis**; documentado em `catalog.sql` e `DRAFT-BRIEF.md`. |
| PD43 | **Desvio de segurança documentado:** cookies de auth do `@supabase/ssr` são `httpOnly: false` (exigência do client browser); `Secure` explícito em produção e `SameSite=Lax`. **Risco aceito em DA1 (2026-10-19)**: não mudar o fluxo de auth; falta apenas o texto de justify em `SECURITY.md`/README. Não declarar conformidade total com `HttpOnly`. |
| PD44 | CSRF: localhost aceito na checagem de `Origin` **somente fora de produção**; em produção valem a origem da requisição e `NEXT_PUBLIC_SITE_URL`. |
| PD45 | `minimum_password_length = 8` no `[auth]` do `supabase/config.toml`; proxy com matcher excluindo `/api/*` e `/auth/callback` para não renovar sessão em dobro. |

## 16. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Sem testes automatizados | regressões nas regras | checklist manual detalhado + SQL de verificação + `next build` |
| Revisão das 200 questões atrasar | bloqueia seed/produção | começar o banco em paralelo; gate humano explícito |
| Vazamento do gabarito por RPC | quebra o quiz | payloads sem `is_correct`; revisão de funções; testes SQL de acesso |
| Service role vazar para o cliente | comprometimento total | nunca importar em `src/`; não configurar na Vercel |
| E-mail do Supabase com limite de envio | recuperação falha em produção | monitorar; SMTP externo só com aprovação |
| Latência/cold start > 300 ms | meta D62 | RPC única, índices, sem N+1; medir manualmente |
| Corrida no cadastro de apelido | erro no signup | pré-checagem + trigger; mensagem para tentar outro apelido |
| Relógio do cliente errado | timer visual divergente | `deadlineAt` + `serverNow`; servidor decide |
| Sessão antiga `in_progress` | resumo bloqueado | TTL de 2 h no summary/start |
| LGPD sem exclusão de conta (D47) | limitação aceita | registrar no README; e-mail nunca exposto |
| Free tier (DB/egress/auth) | limites em produção | monitorar; sem Storage/Realtime |

## 17. Definição de pronto

- [ ] RF1–RF16 atendidos; D24–D65 aplicáveis respeitados.
- [x] 200 questões ativas, 40/nível, 13/13/14, 9 opções, explicação; revisão humana registrada em 2026-10-20 (`meta.reviewed_by`).
- [ ] Sessão sempre com 10 questões, 2/nível, 3/3/4 assuntos, 4 alternativas A–D.
- [ ] Timer de 20 s no servidor; resposta após o prazo é erro; feedback sem cronômetro.
- [ ] Sorteio estável; refresh inicia nova sessão; abandonada não entra no ranking.
- [ ] Login/cadastro/recuperação/logout funcionando; apelido único; e-mail nunca exposto.
- [ ] RLS deny-all; RPCs com `search_path` fixo; gabarito inacessível antes da resposta.
- [ ] Ranking 1 linha/usuário, melhor marca, desempates, top 10 + posição.
- [ ] Visual glass azul/lilás, pt-BR, responsivo, teclado/foco/contraste/reduced motion; Lighthouse ≥ 90.
- [ ] `typecheck`, lint e build passam; checklist manual e SQL executados com evidência.
- [ ] Produção: confirmação de e-mail ligada, sem usuários fictícios, service role ausente, headers/cookies ativos.
- [ ] Nenhuma decisão pendente nesta fase; mudanças futuras entram como novo registro PD.

## 18. Sincronização documental (F0)

| Documento | Ação |
| --- | --- |
| `AGENTS.md` | **Concluído em 2026-10-19**: v1.2/autenticação, D66–D70 descartadas, sessão por `auth.uid()`, ranking por usuário, verificação sem testes automatizados. |
| `.opencode/skills/frontend-design/SKILL.md` | **Concluído em 2026-10-19**: login/cadastro/recuperação, apelido público/único, logout, ranking por usuário, sem e-mail. |
| `prd.md` | **Sem alteração** (já está em v1.2). |
| `SECURITY.md` | **Sem alteração** (regras continuam válidas; auth usa Supabase). |

> `AGENTS.md`, skill, `prd.md` e `SECURITY.md` estão alinhados. `pod.md` §9 é a referência de rotas de UI.

## 19. Snapshot da implementação (2026-10-19)

**Estado:** código completo e compilando; migrations **aplicadas** no projeto dev e 200 questões semeadas. Snapshot do repositório:

```text
.
├─ src/
│  ├─ proxy.ts                       # Next 16 (substitui middleware.ts): sessão + protege /quiz e /resumo
│  ├─ app/
│  │  ├─ layout.tsx · globals.css · page.tsx · error.tsx · not-found.tsx
│  │  ├─ login/ cadastro/ recuperar-senha/ redefinir-senha/ quiz/ resumo/ ranking/ (page.tsx)
│  │  ├─ auth/callback/route.ts
│  │  └─ api/{quiz/{start,answer,advance,summary},ranking,nickname}/route.ts
│  ├─ components/
│  │  ├─ ui/        GlassCard, Button, TextField, Alert, Icons
│  │  ├─ layout/    SiteHeader
│  │  ├─ auth/      LoginForm, SignupForm, RecoveryForm, ResetForm, LogoutButton
│  │  ├─ quiz/      QuizRunner, QuestionCard, OptionButton, Timer, FeedbackPanel, SummaryList
│  │  └─ ranking/   RankingTable
│  └─ lib/
│     ├─ env.ts · api.ts · validation.ts
│     ├─ quiz/{types,errors}.ts
│     ├─ auth/{viewer,redirect}.ts
│     └─ supabase/{server,client}.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/ 20261019000{100_schema,200_functions,300_rls,400_catalog,500_seed_helpers}.sql
│  └─ seed/       questions.json (200 rascunhos) · drafts/level-{1..5}.json · DRAFT-BRIEF.md
├─ scripts/       seed.ts · seed-dev-users.ts · verify-security.sql
├─ .opencode/skills/frontend-design/SKILL.md
└─ prd.md · SECURITY.md · AGENTS.md · pod.md · pod_v2.md · README.md
```

**Diferenças de nome em relação ao alvo (§3), todas intencionais:** `src/proxy.ts` (não `middleware.ts`); `src/lib/validation.ts` (não `validation/schemas.ts`); `src/lib/quiz/{types,errors}.ts` (não `quiz/{rules,payloads}.ts`); `src/lib/auth/{viewer,redirect}.ts` (não `auth/guards.ts`); componentes de quiz incluem `OptionButton`/`Timer`; quinta migration de seed helpers.

**Correções aplicadas nesta rodada (fora do rascunho original):** sentinela de TTL (PD36), `answered` no resumo (PD37), opções 2×2 (PD38), estados de erro + `error.tsx` (PD39), limpeza de eyebrows/marcadores (PD40), HTTP 400 para input inválido (PD41), nomes de exibição do prd (PD42), cookies `Secure` + desvio `HttpOnly` (PD43), CSRF de localhost só fora de produção (PD44), `minimum_password_length` + matcher do proxy (PD45), e remoção do campo de confirmação de senha em `/redefinir-senha`.

**Evidência:** §12.1. **Riscos abertos:** verificação do desvio `HttpOnly` (decidido em DA1, falta o texto em `SECURITY.md`); checklist manual de E2E; a11y/performance; deploy. Auditoria de RLS **fechada** em 2026-10-20 (`verify-security.sql` passou no dev) e **revisão humana das 200 questões concluída** na mesma data (`meta.reviewed_by` preenchido, dry-run de produção exit 0).

## 20. Trabalho pendente

O plano do que falta — em ordem de prioridade, com critérios de aceite e comandos — está em **`pod_v2.md`**. Este documento (§1–§19) permanece como desenho aprovado e registro do que foi feito.

