# AGENTS.md

## Repo state

- Implementation exists and builds: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 in `src/`, Supabase Postgres/Auth in `supabase/`, local seed scripts in `scripts/`.
- Docs: `prd.md` **v1.2** is the product source of truth; `SECURITY.md` prevails on any conflict; `pod.md` is the approved technical design **plus an implementation snapshot**; `pod_v2.md` lists **only the work that is still pending**; `bug_log.md` tracks defects found by manual testing, each with evidence and an acceptance criterion.
- Visual system: `.opencode/skills/frontend-design/SKILL.md` (glass blue/lilac, Sora + JetBrains Mono). Load it before changing UI.
- `npm run typecheck`, `npm run lint` and `npm run build` pass. The hosted **dev** Supabase project (`tcpmvnxjegitfktdbcjo`, `.env.local` ready, CLI authenticated) is **migrated** (5/5) with the prd display names in the catalogue, and the **200 questions are seeded** (200 active, 1,800 options, 40/level, 13/13/14; idempotent on a second run — verified 2026-10-19). Manual E2E started the same day: one completed session (score 8, 10/10 answered), 20 question views. **Defects live in `bug_log.md`**: BUG-001 (user without a `profiles` row is invisible in the ranking), BUG-003 (login error message), BUG-004 (dev e-mail confirmation was required) and BUG-005 (header showing "Entrar" while logged in) are **fixed and verified 2026-10-20**; BUG-006 (D26 seed gate) was fixed the same day. Only **BUG-002** (Android login) remains open, awaiting the user's answers. The RLS/policy audit is now **verified** (see Verification). The dev project holds **2 auth users** (`dev-ana`, `dev-bruno`, both confirmed); the Android account was deleted on 2026-10-20 with no orphan rows.
- **No automated test suite** (project decision). Do not add Vitest/Playwright unless the user asks.
- Git is live: branch `main`, initial commit `5c6a730`, remote `origin` = `https://github.com/Roger-Marx/F2-Aula1---Copy`. Commit identity is the GitHub noreply address `210554545+Roger-Marx@users.noreply.github.com` (set **locally**, not globally). **DA6 decided (2026-10-20): the repo is intentionally PUBLIC** — the user accepted that `supabase/seed/questions.json` exposes the answer key because the project is didactic. This supersedes the old "must be private" rule. Do not "fix" it back to private, and do not warn again about the answer key.
  - Consequence to respect: **no credential may ever enter the history.** `.env.local` (service role key) stays ignored; only `.env.example` placeholders are committed. The `tcpmvnxjegitfktdbcjo` project ref appears in the docs — that is the **dev** project and a ref is not a credential.
  - Residual risk accepted along with it: the **dev** Supabase project has e-mail confirmation OFF by design (D45; BUG-004), so strangers can sign up on it. Keep dev data non-sensitive and never point `.env.local` at production.
- **`main` has branch protection enabled** (applied 2026-10-20, verified): force pushes are **blocked** (GitHub returns `422 Cannot force-push to this branch`), branch deletion is blocked, and linear history is required. `enforce_admins` is `false` and there is **no** pull-request requirement, so solo work stays friction-free while a normal `git push` is unaffected.
  - Practical consequence: the history published on `main` can no longer be rewritten by accident. To redo an already-pushed commit, the options are a new revert commit, or temporarily lifting the protection in Settings → Branches.
  - One bootstrap force-push predates the protection: the GitHub auto-generated "Initial commit" (`5485b88`, a 2-line `README.md`) was replaced by `5c6a730`. It carried no authored content and nothing sensitive.
- `SECURITY.md` describes enforcement via `opencode.jsonc` and `.opencode/plugins/containment-guard/`; **neither exists** in this snapshot. Do not rely on them.

## Commands

```bash
npm install
npm run dev            # next dev
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run build          # next build
npm run seed -- --dry-run --env=dev          # validates questions.json without touching Supabase
npm run seed -- --env=dev                    # upsert questions (needs .env.local service role)
npm run seed -- --env=production             # refuses while meta.reviewed_by is a placeholder
npm run seed:dev-users                       # 2 fictional users; SEED_ENV=dev and not on Vercel
```

Supabase CLI runs via `npx supabase` (not a project dependency). `login` and `link --project-ref` are **already done**; the next step is `db push`, then `scripts/verify-security.sql`.

## Scope

Only build what `prd.md` + `pod.md` approve. **Out of scope:** admin panel, OAuth/magic link, account deletion, history screen, profile editing, themes, UI/animation libraries.

- npm + Node 22 LTS; commit `package-lock.json`; do not switch package manager without asking.
- All UI copy is **pt-BR**, sentence case, no emojis.
- Schema changes only via new files in `supabase/migrations` (forward-only, never edit an applied migration in production).

## Architecture map

```text
src/app/                 routes (pages + route handlers)
  page.tsx               home · login/ cadastro/ recuperar-senha/ redefinir-senha/
  quiz/ resumo/ ranking/ · auth/callback/route.ts · error.tsx · not-found.tsx
  api/quiz/{start,answer,advance,summary}/route.ts · api/ranking/route.ts · api/nickname/route.ts
src/components/{ui,auth,layout,quiz,ranking}/
src/lib/api.ts           jsonOk/jsonError, isSameOrigin (CSRF), rpcErrorResponse, rpcPayloadError
src/lib/env.ts           env presence + required accessors
src/lib/validation.ts    Zod schemas for route input
src/lib/quiz/{types,errors}.ts   payload types + error codes/messages/status
src/lib/auth/{viewer,redirect}.ts
src/lib/supabase/{server,client}.ts   anon key + cookies only
src/proxy.ts             session refresh + protects /quiz and /resumo (Next 16, not middleware.ts)
supabase/migrations/     5 files: schema, functions, rls, catalog, seed helpers
supabase/seed/           questions.json (200 drafts) + drafts/ + DRAFT-BRIEF.md
scripts/                 seed.ts, seed-dev-users.ts, verify-security.sql
```

The layout differs from `pod.md` §3 on purpose: there is no `validation/schemas.ts`, `quiz/rules.ts`, `quiz/payloads.ts`, `auth/guards.ts` or `middleware.ts`, and there is a fifth migration (`20261019000500_seed_helpers.sql`). `pod.md` §19 records the real structure.

## Auth and identity

- Supabase Auth **email + password**, minimum 8 characters (also set in `supabase/config.toml`). Recovery included; no OAuth/magic link.
- Email confirmation **off in dev**, **on in production**. `profiles` is created by a trigger on `auth.users`; nickname is unique (case-insensitive), 3–20 chars, immutable in v1.
- Login is required to play; the ranking is public. The email is never exposed or logged; the ranking shows nickname only.
- `/quiz` and `/resumo` require a session; the proxy refreshes it and protects both routes, and is excluded from `/api/*` and `/auth/callback` (those handlers refresh the session themselves). Authorization always uses `getUser()`, never `getSession()`.
- **Known deviation:** `@supabase/ssr` auth cookies are `httpOnly: false` (the browser client must read them; `HttpOnly` would break the current flow). `Secure` is set explicitly in production and `SameSite=Lax` is kept. The quiz cookie `oq_quiz_session` **is** `HttpOnly`. Do not claim full `HttpOnly` compliance. **DA1 decided (2026-10-19): the risk is accepted** — do not re-open without a new decision. Residual weakness to keep in mind: the CSP uses `script-src 'unsafe-inline'`. Recorded in `pod.md` PD43; only the justify text in `SECURITY.md`/README is still missing.

## Non-obvious quiz rules (easy to get wrong)

- **Quiz tables are never read directly by the client.** RLS is deny-all; all access goes through `security definer` RPCs with `search_path = ''`. The answer key must never reach the client before the answer.
- **Session ownership is `auth.uid()`**, never a token. The `oq_quiz_session` cookie only carries the session UUID; ownership is re-checked in the DB. One in-progress session per user; a new start abandons the previous one.
- **The shuffle is persisted at session start:** 10 questions (2 per level, increasing difficulty), 1 correct + 3 of the 8 wrong options, A–D labels by displayed order. It must not change on refresh or in the summary.
- **The timer is server-adjudicated:** an answer arriving after 20s is wrong regardless of client state. The feedback/explanation interval is untimed.
- **No session resume:** reload starts a new session; an abandoned session auto-completes, unanswered counts as wrong, and **does not** feed the ranking.
- **Cycle is per user and per level:** avoid already-seen questions; when all 40 of a level are viewed, clear that level's history and start a new cycle.
- **Ranking keeps one row per user** with the best score; ties break by earliest achievement, then nickname case-insensitively; Top 10 + the current user's position.
- **Abandon-on-TTL returns a JSON error sentinel**, not `raise exception`, so the abandonment is not rolled back with the transaction (`return jsonb_build_object('state','error','code','SESSION_CLOSED')`). Route handlers translate it with `rpcPayloadError()`. There is **no `sweep_stale_session` function** (despite `pod.md` §6.7 listing one) — abandonment is lazy, on the next call.
- Bank is exactly 200 questions: 40 per level, ~13/13/14 per subject, 8 distractors each, mandatory explanation.
- Display names follow `prd.md` (levels Fácil/Média/Desafiadora/Difícil/Expert; subjects Fundamentos OpenCode e CLI / Features e Produtividade / Boas práticas de uso) while **slugs stay stable** as seed keys (`basico`, `configuracao`, `fluxo`).

## Security constraints

- Supabase URL/anon/service-role keys only in `.env.local` (unversioned); the **service role stays server-side** and is used only for migrations/seed. It is never imported by `src/` nor configured on Vercel.
- RLS on all tables with **no direct client policies**; all quiz access via `security definer` RPCs with `search_path` pinned. Validate all input in Route Handlers (Zod); no SQL string concatenation.
- CSRF: `SameSite=Lax` cookies + `Origin` check against the request origin and `NEXT_PUBLIC_SITE_URL`; localhost is accepted **only outside production**.
- Authorized network hosts only: `*.supabase.co`, `*.vercel.app`. Any other host needs confirmation.
- Email is personal data: never log or return it.
- Production seed contains questions only — no test sessions or fictional users. Dev seed users are gated by `SEED_ENV=dev` and non-Vercel execution.
- The 200 questions are agent-drafted but **human-reviewed** (gate D26); do not self-approve. Production seed fails closed while `meta.reviewed_by` is a placeholder.

## Verification

Report only checks actually executed.

Currently verified locally (2026-10-20):

- `npm run typecheck` — passes
- `npm run lint` — passes
- `npm run build` — passes (17 routes, proxy present)
- `npm run seed -- --dry-run --env=dev` — passes: 200 questions, 40/level, 13/13/14 per level
- `npm run seed -- --dry-run --env=production` — **now fails closed**, as it should: `meta.reviewed_by` is `"Automático"` and the seed gate rejects it (see Pending #4)
- `npm run review -- --flags` — 200 questions, **0 rubric errors**, **12 warnings** (all human judgment: 4 "correct answer too long", 8 "distractor by exclusion")
- Answer key is **not** in the question payload: `build_question_payload` (`20261019000200_functions.sql:85`) projects only `sessionQuestionId`/`position`/`total`/`prompt`/`options[{label,body}]`/`deadlineAt`/`serverNow`; `is_correct` lives in `session_options` but is never projected, and is compared only inside `rpc_submit_answer`. `is_correct` appears in no file under `src/`.
- `oq_quiz_session` cookie is `httpOnly: true`
- Git: `main` clean and in sync with `origin/main`; branch protection verified to reject a force push (`422 Cannot force-push to this branch`)

Remote checks executed (read-only, 2026-10-19):

- `npx supabase migration list --linked` — **5/5 migrations applied** (remote = local)
- 9 tables exist (`levels`, `subjects`, `questions`, `question_options`, `quiz_sessions`, `session_questions`, `session_options`, `question_views`, `profiles`), plus the 7 `rpc_*` functions and `seed_question`/`seed_finalize`
- catalogue read back from the DB: levels Fácil/Média/Desafiadora/Difícil/Expert; subjects Fundamentos OpenCode e CLI / Features e Produtividade / Boas práticas de uso
- anon is denied on every table (`42501 permission denied`) and its API spec exposes 0 tables / 0 RPCs; it can call only `rpc_public_ranking` (`{top:[],me:null}`) and `rpc_check_nickname`, and `rpc_start_session` as anon returns `42501`
- **data seeded**: `questions` = 200 (all `is_active`), `question_options` = 1,800, 200 unique `external_id`; a second `npm run seed -- --env=dev` left the counts unchanged (idempotent); sampled questions have 9 options with exactly 1 correct
- as of 2026-10-20: `profiles` = 2 (`dev-ana`, `dev-bruno`), `quiz_sessions` = 2 (1 `completed` com score 8, 1 `in_progress`), `question_views` = 20; the Android account (`roger`) was deleted by the user, leaving no orphan rows

Dev Auth configuration, read back on 2026-10-20 (Management API + public `/auth/v1/settings`):

- `external.email = true`, `mailer_autoconfirm = true` (confirmation **off**, per D45), `disable_signup = false`, `password_min_length = 8`
- `site_url = http://localhost:3000`, `uri_allow_list` empty (enough for dev; the allow list must be filled in for production)
- Signup of a throwaway user returned HTTP 200 **with a session and `email_confirmed_at` already set**; login with the same password returned 200 `bearer`; a 7-character password was rejected with 422. The throwaway user was deleted afterwards (back to 2 users / 2 profiles).

`scripts/verify-security.sql` was **executed** on 2026-10-20 and **passed** — no exception raised, and the measured values corroborate it: 9/9 `public` tables with RLS, **0** policies, `anon` denied `SELECT` on `question_options`/`quiz_sessions` and `EXECUTE` on `rpc_start_session`, `authenticated` denied `SELECT` on `session_options` and `EXECUTE` on `select_session_questions`, **17/17** `security definer` functions with `search_path = ""`, 200 active questions and 0 with an invalid shape. HTTP probes with the `anon` key returned 401/42501 on every table read and on every session RPC; only `rpc_public_ranking` and `rpc_check_nickname` answered 200.

Caveats to keep honest: there is still no `psql` and no Docker on this machine, so the script ran through the Supabase Management API (`POST /v1/projects/{ref}/database/query`) rather than the dashboard SQL Editor. That endpoint does not return `NOTICE` output, so "passed" means "raised no exception", corroborated by the values above. The runner lived in a temp directory **outside the repo** and added no dependency. Production still needs its own run.

**Pending, in order** (commands, owners and acceptance criteria in `pod_v2.md` sections 1 and 9):

1. ~~`npx supabase db push`~~ — **done** (2026-10-19; confirmed by `migration list --linked`).
2. ~~`npm run seed -- --env=dev`~~ — **done** (2026-10-19; 200 questions, idempotent).
3. ~~`scripts/verify-security.sql`~~ — **done** (2026-10-20, passed via Management API; see Verification). Re-run it in **production** once that project exists.
4. `meta.reviewed_by` in `supabase/seed/questions.json` is `"Automático"` — **owner: user** (the human reviewer, D26). The seed gate now rejects it (fixed 2026-10-20), so the production dry-run fails until a real name is filled in. Use `npm run review -- --level=N --full` to review.
5. Manual E2E — **owner: user** (browser). BUG-001, BUG-003, BUG-004 and BUG-005 fixed and verified 2026-10-20; BUG-004 was proven by API (signup returns a session, login works), so the remaining step is doing it **through the UI**, on desktop and on Android. Still open: **BUG-002** (needs the user's answers about the blank Android form — **owner: user**; H1 is now eliminated by the BUG-004 fix, leaving H2/H2b). Then password recovery, a11y/perf and deploy.
6. ~~Initial commit~~ — **done** (2026-10-20, on explicit authorization): `main` on GitHub, `origin` connected, branch protected against force-push.

Still not executed end-to-end: the Android login (BUG-002), password recovery, Lighthouse/a11y, performance measurement, deploy.

Before calling anything done, confirm: sessions are not client-editable, RLS denies direct access, anon cannot read the answer key, every session mutation checks `auth.uid()` ownership, and the production seed has no test data. Pending items and their acceptance criteria live in `pod_v2.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
