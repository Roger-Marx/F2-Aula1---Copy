# OpenCode Quiz

Quiz em pt-BR sobre OpenCode e vibe coding: 10 questões por sessão, 20 segundos
por resposta, feedback com explicação e ranking público por apelido.

A fonte de produto é `prd.md` v1.2; o plano de desenvolvimento é `pod.md`; as
regras de segurança prevalecem em `SECURITY.md`. O trabalho que ainda falta
(verificação em Supabase, revisão humana das questões, a11y/perf e deploy) está
em `pod_v2.md`.

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

**Estado atual:** o conteúdo é um rascunho gerado por agente e está com
`meta.reviewed_by` pendente. A revisão humana é um gate obrigatório (D26). O
script falha fechado no modo produção enquanto o revisor não for preenchido.

Valide sem tocar no banco:

```bash
npm run seed -- --dry-run --env=dev
```

Depois da revisão humana, atualize `meta.reviewed_by`/`meta.reviewed_at` e rode:

```bash
npm run seed -- --env=production
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

Status executado nesta implementação:

- `npm run typecheck` — passou
- `npm run lint` — passou
- `npm run build` — passou (Next.js 16.4.2; 17 rotas + proxy)
- `npm run seed -- --dry-run --env=dev` — passou (200 questões válidas; 40/nível; 13/13/14)
- Supabase dev (projeto `tcpmvnxjegitfktdbcjo`) — **5/5 migrations aplicadas** (`npx supabase migration list --linked`)
- `npm run seed -- --env=dev` — passou duas vezes (idempotente): 200 questões ativas, 1.800 opções, 40/nível, 13/13/14; catálogo confere com o `prd.md`
- Acesso `anon` às tabelas — negado (`42501 permission denied`); só as RPCs públicas respondem (`rpc_public_ranking` → `{top:[],me:null}`, `rpc_check_nickname`)
- `scripts/verify-security.sql` (RLS on + zero policies + `search_path`) — **não executado**: sem `psql` local e `supabase db dump` exige Docker; rodar no SQL Editor do dashboard
- Fluxo manual (auth/quiz/resumo/ranking), Lighthouse e performance — **não executados**

O que **não** foi verificado ainda está detalhado em `pod_v2.md`; não trate os
itens acima como validação end-to-end.

## Limitações conhecidas

- Os cookies de autenticação do `@supabase/ssr` são `httpOnly: false` (o client
  browser precisa lê-los). `Secure` é aplicado em produção e `SameSite=Lax` é
  mantido, mas **não** há conformidade total com `HttpOnly` — desvio registrado
  em `pod.md` PD43 e pendente de decisão de segurança (`pod_v2.md` P2.1). O
  cookie de quiz `oq_quiz_session` é `HttpOnly`.
- Sem exclusão de conta (D47) e sem tela de histórico/perfil; e-mail nunca é
  exibido nem registrado em log.
- Sem suíte de testes automatizada (decisão do projeto).

## Deploy

- Vercel em `*.vercel.app`; sem domínio customizado.
- Configure apenas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `NEXT_PUBLIC_SITE_URL`.
- No Supabase, configure `Site URL` e as redirect URLs de produção para
  `https://<app>.vercel.app/auth/callback`.
- Habilite confirmação de e-mail em produção; em dev pode ficar desligada.
- Rode o seed de produção somente após a revisão humana e sem usuários fictícios.

## Estrutura

```text
src/app/          rotas, API handlers e páginas
src/components/   UI, auth, quiz e ranking
src/lib/          env, Supabase, validação e tipos
src/proxy.ts      renovação de sessão e proteção de /quiz e /resumo
supabase/         migrations, config e seed
scripts/          seed e verificação SQL
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
