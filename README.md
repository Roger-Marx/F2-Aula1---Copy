# OpenCode Quiz

Quiz em pt-BR sobre OpenCode e vibe coding: 10 questões por sessão, 20 segundos
por resposta, feedback com explicação e ranking público por apelido.

A fonte de produto é `prd.md` v1.2; o plano de desenvolvimento é `pod.md`; as
regras de segurança prevalecem em `SECURITY.md`. O que ainda falta (restante do
checklist manual, a11y/perf e deploy) está em `pod_v2.md`.

## Estado atual (2026-10-20)

Implementação completa e compilando, rodando contra o projeto Supabase de
**desenvolvimento**. Nenhum defeito aberto.

- Banco de dev migrado (5/5) e auditado; 200 questões ativas semeadas
  (idempotente) e revisão humana das questões atestada (D26).
- Fluxo manual verificado no desktop e em um celular Android real: cadastro,
  login, quiz de 10 questões, resumo e ranking.
- Ainda **não** executado: recuperação de senha, o restante do checklist manual
  de `pod_v2.md` §3 (apelido, timer de 20 s, refresh/abandono, `next`),
  a11y/perf, headers/CSP e todo o deploy.
- Sem suíte automatizada: a verificação é typecheck, lint, build, SQL e
  checklist manual.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth (e-mail + senha), Postgres e RPCs `security definer`
- npm + Node 22 LTS (`.nvmrc`); lockfile versionado
- Sem suíte automatizada nesta implementação; verificação por typecheck, lint,
  build, SQL e checklist manual

## Rodando localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SEED_ENV=dev
```

`SUPABASE_SERVICE_ROLE_KEY` é usada **apenas** por scripts locais de seed e nunca
deve ser configurada na Vercel nem importada por `src/`.

## Supabase

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npm run seed -- --env=dev
npm run seed:dev-users   # opcional; exige SEED_ENV=dev e fora da Vercel
```

As migrations aplicam, nesta ordem:

1. schema, constraints e trigger de forma das 9 opções;
2. funções internas e RPCs;
3. RLS deny-all, revokes e grants;
4. catálogo fixo de 5 níveis e 3 assuntos;
5. helpers transacionais de seed (service role apenas).

O app usa somente a anon key + JWT do usuário. Tabelas de quiz não são lidas
diretamente: todo acesso passa por RPCs.

### Seed

`supabase/seed/questions.json` contém 200 questões (40 por nível, 13/13/14 por
assunto) com 9 alternativas e 1 correta.

As questões foram rascunhadas por agente e **revisadas por humano**
(`meta.reviewed_by = "Roger_Marx"`, `reviewed_at = "2026-10-20"`). O gate D26
está aberto: o seed de produção passa no dry-run. O script continua falhando
fechado se o campo voltar a um placeholder (inclusive `automático`/`auto`/`ia`),
porque o agente não pode se autoaprovar.

Valide sem tocar no banco:

```bash
npm run seed -- --dry-run --env=dev
npm run seed -- --dry-run --env=production
```

Leitura e conferência da rubrica:

```bash
npm run review -- --flags            # avisos objetivos nas 200
npm run review -- --level=3 --full   # um nível, com alternativas e explicação
```

O seed faz upsert por `external_id`, substitui as opções em transação e desativa
questões removidas do JSON sem apagar o histórico. Sessões antigas usam snapshots.

## Verificação

```bash
npm run typecheck
npm run lint
npm run build
```

Os checks SQL ficam em `scripts/verify-security.sql` (RLS, policies, grants,
200 questões, 40/nível, 13/13/14, 9 opções/1 correta, `search_path` fixo). O
checklist manual completo está em `pod.md` §12.

Executado localmente (2026-10-20, dev server parado):

- `npm run typecheck` — passou
- `npm run lint` — passou
- `npm run build` — passou (Next.js 16.4.2; 17 rotas + proxy)
- `npm run seed -- --dry-run --env=dev` — passou (200 questões; 40/nível; 13/13/14)
- `npm run seed -- --dry-run --env=production` — passou (exit 0); falha de novo se
  `meta.reviewed_by` voltar a ser placeholder
- `npm run review -- --flags` — 200 questões, 0 erros objetivos, 12 avisos de
  julgamento humano
- `npm run seed -- --env=dev` — passou duas vezes (idempotente): 200 questões
  ativas, 1.800 opções, 200 `external_id` únicos

Executado no projeto Supabase de dev (`tcpmvnxjegitfktdbcjo`):

- 5/5 migrations aplicadas (`npx supabase migration list --linked`); 9 tabelas e
  7 RPCs presentes
- `scripts/verify-security.sql` — **passou**: RLS em 9/9 tabelas, 0 policies,
  `anon` sem `SELECT` em `question_options`/`quiz_sessions` e sem `EXECUTE` em
  `rpc_start_session`, `authenticated` sem `SELECT` em `session_options`,
  17/17 funções `security definer` com `search_path = ""`
- Sondas HTTP com a anon key: 401/42501 em todas as tabelas e RPCs de sessão;
  só `rpc_public_ranking` e `rpc_check_nickname` respondem 200
- Auth de dev: confirmação de e-mail desligada (D45), senha mínima 8, 7 usuários
  de teste confirmados
- Fluxo ponta a ponta em celular Android real: `/cadastro` → `/api/nickname` →
  `/quiz` (10 `answer` + 10 `advance`) → `/resumo` → `/ranking`

Não executados: recuperação de senha, o restante do checklist manual de
`pod_v2.md` §3, Lighthouse/a11y, medição de performance e o deploy. Não trate os
itens acima como validação end-to-end de produção.

## Limitações conhecidas

- Os cookies de autenticação do `@supabase/ssr` são `httpOnly: false` (o client
  browser precisa lê-los). `Secure` é aplicado em produção e `SameSite=Lax` é
  mantido, mas **não** há conformidade total com `HttpOnly`. Risco **aceito**
  (DA1, `pod.md` PD43). O cookie de quiz `oq_quiz_session` é `HttpOnly`.
- Resíduo de segurança aceito: a CSP usa `script-src 'unsafe-inline'`.
- O repositório é **público por decisão** (DA6): o `supabase/seed/questions.json`
  expõe o gabarito, o que é aceitável em um projeto didático. Nenhuma credencial
  entra no histórico; `.env.local` permanece ignorado.
- O projeto de dev tem confirmação de e-mail desligada, então qualquer pessoa
  pode criar conta nele. Nunca aponte `.env.local` para produção.
- Sem `psql` nem Docker nesta máquina: o `verify-security.sql` roda pelo
  Management API do Supabase, que não devolve `NOTICE` — "passou" significa "não
  levantou exceção", corroborado pelos valores medidos.
- Sem exclusão de conta (D47) e sem tela de histórico/perfil; e-mail nunca é
  exibido nem registrado em log.
- Sem suíte de testes automatizada (decisão do projeto).

## Deploy

Ainda **não iniciado** (`pod_v2.md` §6). O roteiro:

- Vercel em `*.vercel.app`; sem domínio customizado.
- Configure apenas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `NEXT_PUBLIC_SITE_URL`. Nunca a service role key.
- Crie o projeto Supabase de produção, rode `db push`, o seed **somente de
  questões** e o `verify-security.sql` nele.
- Ajuste `Site URL` e as redirect URLs para
  `https://<app>.vercel.app/auth/callback` e `/redefinir-senha`.
- Habilite confirmação de e-mail em produção (em dev está desligada).

## Estrutura

```text
src/app/          rotas, API handlers e páginas
src/components/   UI, auth, quiz e ranking
src/lib/          env, Supabase, validação e tipos
src/proxy.ts      renovação de sessão e proteção de /quiz e /resumo
supabase/         migrations, config e seed
scripts/          seed, revisão das questões e verificação SQL
```

## Segurança

- RLS deny-all em todas as tabelas; zero policies.
- Apenas RPCs públicas recebem `grant execute`.
- `security definer` com `search_path = ''` e nomes qualificados.
- Sessão de quiz pertence a `auth.uid()`; o cookie `oq_quiz_session` carrega
  apenas o UUID e é revalidado no banco.
- Timer de 20 s é decidido no servidor; o cliente não pode pular questão.
- Sem retomada: recarregar `/quiz` abandona a sessão anterior.
- Ranking expõe somente apelido; nunca e-mail.
- Segredos não são logados; service role fica fora do runtime.
