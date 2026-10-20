# pod_v2.md — Trabalho pendente (OpenCode Quiz)

> **Status:** v1.1 — 2026-10-20 — **somente o que falta**.
> **Base:** `prd.md` v1.2, `SECURITY.md`, `AGENTS.md` e `pod.md` v1.1 (§1–§19 = desenho aprovado + snapshot do que já foi feito).
> **Precedência:** `SECURITY.md` > `prd.md` > `pod.md` > `pod_v2.md` > `AGENTS.md`.
> **Regra:** nenhuma tarefa aqui amplia o escopo do `prd.md`. Sem suíte automatizada (decisão do projeto). Só relatar verificação **efetivamente executada**.

## 0. O que este documento é (e o que não é)

- É a lista priorizada do que resta para fechar a fase de Desenvolvimento (fases F2–F8 de `pod.md` §14).
- **Não** é um replanejamento: o desenho continua em `pod.md`. Não repetir aqui o que já está no código.
- **v1.1 (2026-10-20):** reordenado por **caminho crítico** e **dono da tarefa**; separa explicitamente o que só o usuário pode fazer (§9); registra o que foi verificado nesta rodada.

**Já pronto (não refazer):** app Next.js completo e compilando; 5 migrations **aplicadas** no projeto dev; 200 questões semeadas (200 ativas, 1.800 opções, 40/nível, 13/13/14); `typecheck`, `lint` e `build` passam; repositório GitHub no ar com `main` protegida; 3 defeitos corrigidos e verificados. Ver `pod.md` §12.1 e §19.

**Pré-requisitos humanos/ambiente:** acesso ao **dashboard do Supabase** (dev e produção); acesso à conta **Vercel**; um **revisor humano** para as 200 questões (D26); e o próprio usuário para as decisões da §8.2.

---

## 1. Panorama e caminho crítico

### 1.1 Situação por fase (`pod.md` §14)

| Fase | Entrega | Status (2026-10-20) |
| --- | --- | --- |
| **F0 — Sincronização** | docs alinhados à v1.2 | ✅ concluído |
| **F1 — Scaffold** | Next/TS/Tailwind, lint, tokens | ✅ concluído |
| **F2 — Banco** | migrations + seed no dev | ✅ **aplicado e auditado** (5/5, 200 questões; `verify-security.sql` passou em 2026-10-20) |
| **F3 — Auth** | cadastro/login/recuperação, trigger, proxy | 🟡 código pronto; fluxo manual **parcial** (BUG-001/003/004/005 corrigidos; **BUG-002 aberto**) |
| **F4 — Motor** | start/answer/advance/summary/ranking | 🟡 código pronto; RPCs **exercitadas** (20 `question_views`, ranking com `dev-ana`/8) |
| **F5 — UI** | home, auth, quiz, resumo, ranking | 🟡 código pronto; **a11y/perf não medidos** |
| **F6 — Banco de questões** | 200 questões revisadas + seed validado | ✅ 200 sem erro objetivo de rubrica e **revisão humana atestada** (2026-10-20); dry-run de produção exit 0 |
| **F7 — Verificação** | typecheck, lint, build, SQL, checklist manual | 🟡 `typecheck`/`lint`/`build`/review/SQL ✅; **checklist manual pendente** |
| **F8 — Deploy** | Supabase + Vercel + checklist | ⛔ **não iniciado** |
| **Git/GitHub** | versionamento + remote + CI de higiene | ✅ concluído 2026-10-20 (`main`, histórico linear, branch protegida) |

### 1.2 O caminho crítico

```text
P0.3  revisão humana das 200 questões  ✅ concluído 2026-10-20
  │
  └─► meta.reviewed_by preenchido ✅  ──►  seed de produção  ──┐
                                                             │
P0.2  verify-security.sql (dev)  ✅ concluído 2026-10-20 ────┤
                                                             ├──►  F8 deploy
BUG-004  confirmação off no dev  ✅ concluído 2026-10-20 ────┤
                                                             │
BUG-002  respostas do celular ─────► P1 E2E manual ──────────┘
```

**P0.3 era o gargalo.** Agora que ele está concluído, o caminho crítico é só a sequência operacional de deploy: criar o Supabase de produção, criar a Vercel e publicar.

### 1.3 O que trava o quê

| Pendência | Destrava | Bloqueia |
| --- | --- | --- |
| ~~P0.2 `verify-security.sql`~~ ✅ 2026-10-20 | gate de deploy (D56) | — |
| ~~BUG-004 "Confirm email" off no dev~~ ✅ 2026-10-20 | cadastro e login no dev | — |
| BUG-002 respostas do celular | diagnóstico do login Android | P1 §3.1 (item Android) |
| ~~P0.3 revisão humana~~ ✅ 2026-10-20 | seed de produção | — |
| DA3/DA4/DA5 | — | sem travamento técnico | §8.2 |

---

## 2. P0 — Bloqueadores

### P0.1 — Projeto Supabase de dev e migrations

**Status: ✅ concluído (2026-10-19).** Projeto dev `tcpmvnxjegitfktdbcjo` vinculado; **5/5 migrations aplicadas** (`migration list --linked`); catálogo com os nomes do `prd.md`; seed executado duas vezes → 200 questões ativas, 1.800 opções (`200×9`), 40 por nível, 13/13/14 por nível, 200 `external_id` únicos, amostra com 9 opções e 1 correta. `seed:dev-users` executado (3 usuários, 3 profiles).

### P0.2 — Checagens SQL de segurança  ✅ **concluído (2026-10-20)**

Executado e **passou**: nenhuma invariante violada. A execução foi feita pelo **Management API** do Supabase (`POST /v1/projects/tcpmvnxjegitfktdbcjo/database/query`), autenticada com o token que o CLI já mantinha no Credential Manager. Esta máquina continua sem `psql` e sem Docker — o caminho do SQL Editor era o previsto, mas não foi necessário. O script rodou **verbatim** e é somente leitura (`select`, `has_*_privilege`, `raise`), sem DDL nem DML.

**Evidência:**

| Verificação | Medido |
| --- | --- |
| Tabelas `public` com RLS desabilitado | 0 (9/9 com RLS) |
| Policies em `public` | 0 (deny-all) |
| `anon` com `SELECT` em `question_options` / `quiz_sessions` | `false` / `false` |
| `authenticated` com `SELECT` em `session_options` | `false` |
| `anon` com `EXECUTE` em `rpc_start_session` | `false` |
| `anon` com `EXECUTE` em `rpc_public_ranking` / `rpc_check_nickname` | `true` / `true` |
| `authenticated` com `EXECUTE` em `select_session_questions` (interna) | `false` |
| Funções `security definer` **sem** `search_path` fixo | 0 (17/17 com `search_path = ""`) |
| Questões ativas / com forma inválida (9 opções, 1 correta) | 200 / 0 |

**Sondas HTTP como `anon`** (a perspectiva de quem tenta ler o gabarito): leitura de `question_options`, `questions`, `quiz_sessions`, `session_options`, `profiles` e `question_views`, além de `rpc_submit_answer`, `rpc_advance`, `rpc_get_summary`, `rpc_my_profile`, `rpc_start_session` e `seed_question` → **todas 401/42501**. Só `rpc_public_ranking` e `rpc_check_nickname` responderam 200, como previsto.

**Ressalvas:** (a) o endpoint não devolve `NOTICE`, então "passou" significa "não levantou exceção", corroborado pela tabela acima; (b) o runner ficou em diretório temporário **fora do repo**, sem adicionar dependência; (c) **produção ainda precisa da sua própria execução**. A saída está registrada em `bug_log.md` §"Verificações pendentes relacionadas".

**Aceite (D56):** atendido no dev — RLS em todas as tabelas e **zero policies**; `anon`/`authenticated` **não** leem `question_options`/`is_correct`; `anon` não executa RPCs de sessão (só ranking/checagem de apelido); cada questão ativa tem 9 opções e 1 correta; toda função `security definer` tem `search_path` fixo.

**Verificado por inspeção de código (2026-10-20):** o gabarito **não** está no payload da questão. `build_question_payload` (`20261019000200_functions.sql:85`) projeta apenas `sessionQuestionId`, `position`, `total`, `prompt`, `options[{label, body}]`, `deadlineAt`, `serverNow`. A coluna `is_correct` existe em `session_options` mas **nunca é projetada**; a comparação acontece só em `rpc_submit_answer` (linha 667). `is_correct` não aparece em nenhum arquivo de `src/`, e `QuestionPayload` (`src/lib/quiz/types.ts:8`) não tem campo de gabarito. A confirmação em execução foi feita no mesmo dia e está na tabela acima.

### P0.3 — Revisão humana das 200 questões (gate D26)  ✅ **concluído (2026-10-20)**

**Status:** `meta.reviewed_by = "Roger_Marx"` e `meta.reviewed_at = "2026-10-20"` em `supabase/seed/questions.json`. O gate do D26 abriu — `npm run seed -- --dry-run --env=production` passou com **exit 0** e as 200 questões, antes falhava com a mensagem do D26. Nenhum texto de questão foi alterado nesta rodada (o diff do arquivo são só as duas linhas do `meta`), então o banco dev continua em sincronia e **não** precisa de novo seed.

> A revisão é uma **atestação humana**: o código só verifica que o campo não é um placeholder. Quem revisou foi o usuário, não o agente.

- Revisar `supabase/seed/questions.json` conforme a rubrica do `prd.md` §10: 1 correta inequívoca; 8 distratores plausíveis (sem "todas as anteriores", sem comprimento-delator); alinhada ao nível e a um dos 3 assuntos; explicação que ensina (1–3 frases, pt-BR); sem segredos/dados pessoais; enunciados únicos.
- Preencher `meta.reviewed_by` e `meta.reviewed_at` com o **revisor real**.
- O agente **não** autoaprova. Se a correção for substancial, tratar como nova versão do seed.

**Auxiliar criado em 2026-10-20:** `npm run review` (`scripts/review-questions.ts`) — imprime as questões em formato legível e sinaliza automaticamente os cheiros objetivos da rubrica.

```bash
npm run review -- --level=1 --full    # um nível, com enunciado, alternativas e explicação
npm run review -- --flags            # só os avisos da rubrica, nas 200
npm run review -- --level=3          # nível 3 (desafiadora)
```

**Estado do banco (2026-10-20):** **0 erros objetivos** de rubrica nas 200 — todas têm exatamente 1 alternativa correta, nenhum distrator absorvente, nenhum enunciado duplicado, todas as explicações dentro do tamanho mínimo. **12 avisos**, concentrados nos níveis 2, 4 e 5, que pedem olho humano:

| Aviso | Questão | O que olhar |
| --- | --- | --- |
| correta longa demais (75 vs 33) | `FLUX-F1-012` | comprimento delata a resposta |
| correta longa demais (109 vs 48) | `FUND-F4-012` | idem |
| correta longa demais (80 vs 36) | `CONF-F4-003` | idem |
| correta longa demais (152 vs 67) | `CONF-F5-006` | idem |
| distrator por exclusão ("Apenas…") | `FUND-F2-006`, `CONF-F2-004`, `CONF-F2-005`, `FLUX-F2-007` (×2), `FLUX-F2-011` (×2), `CONF-F4-009` | o distrator é reconhecível por exclusão |

> **O que o auxiliar NÃO cobre:** correção factual (a resposta está certa de acordo com a documentação do OpenCode?), adequação ao nível, plausibilidade real dos distratores e qualidade didática da explicação. É aí que entra o humano — o que o script faz é garantir que a parte mecânica da rubrica já está limpa, para o humano gastar o tempo no julgamento.

**Ordem sugerida:** nível 1 primeiro (mais fácil, estabelece o padrão de leitura), depois 2, 3, 4, 5. Use `supabase/seed/drafts/level-{1..5}.json` e `DRAFT-BRIEF.md` como referência de distribuição.

**Aceite:** `meta.reviewed_by` preenchido com nome real; `npm run review -- --flags` sem erros; `npm run seed -- --dry-run --env=production` passa; seed de produção contém **somente questões** (nenhum usuário fictício).

> **Correção aplicada em 2026-10-20:** o gate D26 estava **furado** — `meta.reviewed_by = "Automático"` passava pela validação de seed de produção, porque "automático" não estava na lista de placeholders. Isso permitia ao agente autoaprovar a própria revisão, que é exatamente o que D26 proíbe. `scripts/seed.ts` agora reprova `automático`/`automatico`/`automatic`/`auto`/`agente`/`ia`/`llm`/`modelo` junto com os demais placeholders. **Verificado:** com `"Automático"` o dry-run de produção **falhava** com `meta.reviewed_by precisa estar preenchido para seed de produção (revisão humana, D26)`; depois do preenchimento com o nome real, **passa** com exit 0.

---

## 3. P1 — Verificação funcional ponta a ponta (manual)

Rodar contra dev com `npm run dev`. Executar o checklist de `pod.md` §12 e registrar cada item (data, ambiente, resultado).

### 3.1 Auth
- [ ] Cadastro com e-mail novo, apelido válido e senha ≥ 8 → perfil criado (trigger). *Parcial: o cadastro pelo celular criou conta e profile (BUG-002). Falta o caso "novo e-mail no PC".*
- [ ] Apelido com < 3 ou > 20 caracteres, com caracteres de controle ou duplicado (mesmo variando maiúsc./minúsc.) → rejeitado com mensagem pt-BR.
- [x] Login, logout e `router.refresh()` no header. *(BUG-005 verificado com sessão real em 3 estados.)*
- [ ] Recuperação de senha: `/recuperar-senha` → e-mail → `/auth/callback` → `/redefinir-senha` → login com a nova senha. **Nunca executada.**
- [ ] `next` de redirect só aceita caminho interno (testar `?next=https://evil.example`).
- [ ] `/quiz` e `/resumo` sem sessão redirecionam para `/login?next=...`.
- [ ] Login no Android (BUG-004 eliminado e **BUG-007 corrigido** em 2026-10-20 — o envio nativo do formulário disparava antes da hidratação; falta confirmar no celular).

### 3.2 Quiz (motor)
- [ ] Sessão tem 10 questões, 2 por nível, em ordem crescente de nível; 4 opções rotuladas A–D.
- [ ] Distribuição de assuntos ≈ 3/3/4 (best-effort).
- [x] Payload da pergunta **não** contém gabarito/`is_correct`/explicação. *(Verificado por inspeção de `build_question_payload` + ausência de `is_correct` em `src/`; falta a inspeção em DevTools → Network.)*
- [ ] Refresh no meio do quiz abandona a sessão e inicia outra; a abandonada **não** aparece no ranking.
- [ ] Resposta em ~19 s conta; enviar a resposta logo após 20 s é computada como **erro** mesmo com o cliente mostrando tempo (validar com Network throttling/latência).
- [ ] Feedback mostra correta, sua resposta e explicação; o intervalo de feedback **não** é cronometrado.
- [ ] Sair da tela e voltar: nova sessão (sem retomada).
- [ ] Completar 10 questões → `/resumo`.

### 3.3 Resumo e ranking
- [ ] `/resumo` mostra placar, itens com resposta correta/sua resposta/explicação; questão não respondida aparece como **"Não respondida"**.
- [ ] Sessão abandonada no resumo: "Sessão encerrada", **não** rankeada.
- [x] `/ranking` mostra Top 10, uma linha por usuário (melhor pontuação). *Parcial: `rpc_public_ranking` devolveu `dev-ana`/8 na posição 1 (BUG-001). Falta o desempate e a posição fora do Top 10.*
- [ ] Empate por conquista mais antiga e depois por apelido (case-insensitive).
- [ ] Posição do usuário logado mesmo fora do Top 10.
- [x] Ranking é público e **nunca** exibe e-mail. *Parcial: verificado por grep (`P2.4`). Falta inspeção do payload.*

### 3.4 Estados de erro
- [ ] `/ranking` e `/resumo` com RPC falhando mostram aviso amigável + "Tentar novamente".
- [ ] Falha de rede no quiz mostra painel de erro com "Tentar novamente"/"Voltar ao início".
- [ ] Rate limit: 21 inícios em 1 hora → `RATE_LIMITED` (429) com mensagem pt-BR.

**Aceite:** todos os itens marcados com evidência (data, ambiente, resultado). Qualquer falha vira correção de código/migration antes do deploy.

---

## 4. P2 — Segurança

- [x] **P2.1 — Desvio `HttpOnly` (PD43).** **Fechado (DA1, 2026-10-19):** risco aceito — `@supabase/ssr` exige cookie legível pelo browser; `Secure` explícito em produção e `SameSite=Lax` mantidos. Não declarar conformidade total com `HttpOnly`. **Falta apenas registrar em `SECURITY.md`/`README`** (texto de justify, 5 min).
- [x] **P2.2 — Service role.** Confirmado: `SUPABASE_SERVICE_ROLE_KEY` não aparece em `src/` (grep) nem em nenhum arquivo versionado; existe só em `.env.local` (ignorado) e nos scripts locais. **Reexecutar após o deploy** para confirmar que não está nos envs da Vercel.
- [ ] **P2.3 — Headers/CSP.** Rodar `npm run build && npm start` e conferir `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy` e HSTS (produção) em `next.config.ts`.
- [x] **P2.4 — E-mail nunca exposto.** Grep por `email` nas respostas de RPC/rotas: nenhuma rota o devolve; `RankingEntry` (`src/lib/quiz/types.ts:61`) tem apenas `position`, `nickname`, `score`, `achievedAt`. Falta a inspeção do payload em execução.
- [ ] **P2.5 — CSRF.** Confirmar que origem cruzada é rejeitada (`INVALID_ORIGIN`) e que localhost só é aceito fora de produção.
- [ ] **P2.6 — Ownership.** Confirmar que cada mutation de sessão valida `auth.uid()` (não é possível responder/avançar sessão de outro usuário nem com cookie manipulado).

---

## 5. P3 — UI, acessibilidade e performance

- [ ] Responsivo em 360, 768 e 1280 px (home, auth, quiz, resumo, ranking).
- [ ] Navegação só por teclado em todas as telas; foco visível; opções do quiz são `<button>` reais.
- [ ] Acerto/erro usam **ícone + texto**, nunca só cor; contraste ≥ 4,5:1.
- [ ] `prefers-reduced-motion` respeitado; timer com `role="timer"` sem `aria-live` por segundo.
- [ ] Lighthouse a11y ≥ 90 nas telas principais (home, quiz, resumo, ranking, login/cadastro) — D63.
- [ ] Start percebido < 300 ms p95 (medido no DevTools) — D62; ranking em 1 requisição HTTP.
- [ ] Opções 2×2 no desktop e 1 coluna no mobile; rótulos em sentence case (sem `uppercase` exceto cabeçalho da tabela).

---

## 6. P4 — Deploy (F8)

**Supabase (produção):**
- [ ] Projeto de produção; `db push` das mesmas migrations.
- [ ] Auth: **confirmação de e-mail ligada**; `Site URL` e redirects de produção (`/auth/callback`, `/redefinir-senha`); senha mínima 8; provedores não usados desabilitados.
- [ ] Seed de produção **somente questões**, `meta.reviewed_by` preenchido; nenhum usuário fictício.
- [ ] `scripts/verify-security.sql` no projeto de produção.

**Vercel:**
- [ ] Projeto Next.js, Node 22, conectado ao repositório (`Roger-Marx/F2-Aula1---Copy`).
- [ ] Env somente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. **Sem** service role.
- [ ] Deploy em `*.vercel.app` (sem domínio próprio); headers/CSP ativos; cookies `Secure`.

**Checklist pós-deploy (D56):** sessões não editáveis pelo cliente; RLS deny-all sem policies; `anon`/`authenticated` não leem o gabarito; RPCs exigem `auth.uid()`; seed de produção sem dados de teste; e-mail nunca exposto; fluxo manual completo; Lighthouse ≥ 90; start < 300 ms p95.

**Rollback:** Vercel → redeploy anterior; banco → nova migration forward-only (nada destrutivo sem backup).

---

## 7. P5 — Encerramento

- [ ] Atualizar `pod.md` (status v1.2 — fases concluídas com evidência) e `README.md` (status de verificação real).
- [ ] Registrar os itens executados do §17 de `pod.md` (definição de pronto) com evidência.
- [x] **Primeiro commit git** — feito 2026-10-20 sob autorização explícita: `main` no GitHub, `origin` conectado, branch protegida contra force-push.
- [ ] Fechar as decisões abertas da §8.2.

---

## 8. Decisões

### 8.1 Fechadas

| # | Decisão | Quando |
| --- | --- | --- |
| DA1 | Cookies de auth não-`HttpOnly` (PD43): risco aceito, com `Secure` em produção e `SameSite=Lax` | 2026-10-19 |
| DA6 | Repositório GitHub **público**: o gabarito público é aceitável (projeto didático) | 2026-10-20 |
| DA7 | `main` com **branch protection** (sem force-push, sem deleção, histórico linear); sem exigência de PR | 2026-10-20 |

### 8.2 Abertas (dependem de você)

| # | Decisão | Opções | Impacto | Prazo |
| --- | --- | --- | --- | --- |
| DA2 | Revisão das questões | revisar no lugar vs. reescrever questões específicas | gate F6 | **iniciar já** |
| DA3 | TTL de abandono | manter 2 h (lazy) vs. outro valor | comportamento de sessão | antes do deploy |
| DA4 | SMTP | serviço de e-mail do Supabase vs. SMTP externo | exige autorização de host externo | antes do deploy |
| DA5 | Escopo do deploy | manter `*.vercel.app` sem domínio próprio (prd) | infra | antes do deploy |

---

## 9. Checklist do usuário — em ordem de execução

> O que **só você** pode fazer: dashboard, contas, revisão humana e decisões. Os itens 1, 2 e 4 já foram concluídos (2026-10-20); o item 3 destrava o BUG-002 e é o próximo.

| # | Ação | Onde | Tempo | Destrava |
| --- | --- | --- | --- | --- |
| 1 | ~~Rodar `scripts/verify-security.sql` e colar a saída~~ | — | — | ✅ **feito em 2026-10-20**, passou (P0.2) |
| 2 | ~~Desligar **"Confirm email"**~~ | — | — | ✅ **feito em 2026-10-20** (BUG-004 verificado por API) |
| 3 | Responder as **5 perguntas** do BUG-002 pelo celular | celular, `http://<ip-da-lan>:3000` | ~5 min | BUG-002 |
| 4 | ~~**Revisar as 200 questões** e preencher `meta.reviewed_by`~~ | — | — | ✅ **feito em 2026-10-20** (dry-run de produção exit 0) |
| 5 | Rodar o **checklist manual E2E** do §3 | `npm run dev` + navegador | ~1–2 h | §3, F7 |
| 6 | Medir **a11y e performance** do §5 | DevTools + Lighthouse | ~1 h | §5 |
| 7 | Fechar as decisões **DA3, DA4, DA5** | aqui | ~10 min | §8.2 |
| 8 | Criar o **projeto Supabase de produção** e configurar Auth (confirmação **ligada**, Site URL, redirects) | Dashboard Supabase | ~30 min | F8 |
| 9 | Criar o **projeto Vercel** (Node 22, repo `Roger-Marx/F2-Aula1---Copy`) e configurar os 3 envs | Dashboard Vercel | ~20 min | F8 |
| 10 | `db push` + seed de produção + `verify-security.sql` **na produção** | terminal + dashboard | ~15 min | §6 |
| 11 | Fechar os docs (P5) | local | ~30 min | §7 |

**Sequenciamento:** 3 → 5 e 6 e 7 (em paralelo) → 8 → 9 → 10 → 11. Os itens 1, 2 e 4 estão concluídos.

---

## 10. Comandos de verificação

```bash
npm run typecheck
npm run lint
npm run build
npm run seed -- --dry-run --env=dev
npm run seed -- --dry-run --env=production   # só passa após P0.3
npm run review -- --flags                     # erros/avisos da rubrica nas 200
npm run review -- --level=1 --full            # leitura de um nível
```

**Estado verificado em 2026-10-20:** `typecheck` ✅ · `lint` ✅ · `build` ✅ (17 rotas + proxy) · dry-run dev ✅ · dry-run production ❌ **reprova corretamente** (gate D26 fechado) · `review --flags` → 0 erros, 12 avisos · `git status` limpo, `main` sincronizado com `origin/main`.
