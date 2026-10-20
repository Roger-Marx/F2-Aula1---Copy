# pod_v2.md — Trabalho pendente (OpenCode Quiz)

> **Status:** v1.0 — 2026-10-19 — **somente o que falta**.
> **Base:** `prd.md` v1.2, `SECURITY.md`, `AGENTS.md` e `pod.md` v1.1 (§1–§19 = desenho aprovado + snapshot do que já foi feito).
> **Precedência:** `SECURITY.md` > `prd.md` > `pod.md` > `pod_v2.md` > `AGENTS.md`.
> **Regra:** nenhuma tarefa aqui amplia o escopo do `prd.md`. Sem suíte automatizada (decisão do projeto). Só relatar verificação **efetivamente executada**.

## 0. O que este documento é (e o que não é)

- É a lista priorizada do que resta para fechar a fase de Desenvolvimento (fases F2–F8 de `pod.md` §14).
- **Não** é um replanejamento: o desenho continua em `pod.md`. Não repetir aqui o que já está no código.

**Já pronto (não refazer):** app Next.js completo e compilando; 5 migrations escritas; 200 questões em rascunho válidas (`npm run seed -- --dry-run --env=dev` passa); `typecheck`, `lint` e `build` passam. Ver `pod.md` §12.1 e §19.

**Pré-requisitos humanos/ambiente:** um projeto Supabase **hosted de dev**; acesso ao `supabase login`/CLI; `.env.local` preenchido; acesso à conta Vercel (para F8); um revisor humano para as 200 questões (D26).

---

## 1. P0 — Bloqueadores (nada avança sem isto)

### P0.1 — Criar projeto Supabase de dev e aplicar migrations

```bash
npm install
cp .env.example .env.local        # preencher URL, anon key, service role, SITE_URL
npx supabase login
npx supabase link --project-ref <ref-do-projeto-dev>
npx supabase db push              # aplica as 5 migrations em ordem
npm run seed -- --env=dev         # 200 questões
npm run seed:dev-users            # 2 usuários fictícios (SEED_ENV=dev, fora da Vercel)
```

**Aceite:** as 5 migrations aplicam sem erro; `select count(*) from public.questions` = 200; 40 por nível; 13/13/14 por nível; `npm run seed` idempotente (rodar duas vezes não duplica).

**Status (2026-10-19): ✅ concluído.** Projeto dev `tcpmvnxjegitfktdbcjo` vinculado; 5/5 migrations aplicadas (`migration list --linked`); catálogo com os nomes do `prd.md`; seed executado duas vezes → 200 questões ativas, 1.800 opções (`200×9`), 40 por nível, 13/13/14 por nível, 200 `external_id` únicos, amostra com 9 opções e 1 correta. `seed:dev-users` **não** executado (0 profiles).

**Risco conhecido:** as migrations nunca foram executadas; erros de sintaxe/grant só aparecem aqui. Corrigir via **nova migration**, nunca editando uma aplicada em produção.

### P0.2 — Executar as checagens SQL de segurança

```bash
psql "<connection-string-do-projeto-dev>" -f scripts/verify-security.sql
```

**Aceite (D56):** RLS habilitado em todas as tabelas e **zero policies**; `anon`/`authenticated` **não** leem `question_options`/`is_correct`; `anon` não executa RPCs de sessão (só ranking/checagem de apelido); cada questão ativa tem 9 opções e 1 correta; toda função `security definer` tem `search_path` fixo. Registrar a saída como evidência.

### P0.3 — Revisão humana das 200 questões (gate D26)

- Revisar `supabase/seed/questions.json` conforme o rubric do `prd.md` §10 (correção factual, 1 correta + 8 erradas, explicação obrigatória, pt-BR, sem dado pessoal/segredo, enunciados únicos).
- Usar `supabase/seed/drafts/level-{1..5}.json` e `DRAFT-BRIEF.md` como referência de distribuição.
- Preencher `meta.reviewed_by` e `meta.reviewed_at` com o revisor real (hoje é `"PENDENTE — revisão humana"`).
- O agente **não** autoaprova: se o revisor pedir correções, editar o JSON; se a correção de uma questão for substancial, tratar como nova versão do seed.

```bash
npm run seed -- --dry-run --env=production   # deve passar só depois da revisão
npm run seed -- --env=production
```

**Aceite:** `meta.reviewed_by` preenchido; dry-run de produção passa; seed de produção contém **somente questões** (nenhum usuário fictício).

---

## 2. P1 — Verificação funcional ponta a ponta (manual)

Rodar contra dev com `npm run dev`. Executar o checklist de `pod.md` §12 e registrar cada item.

### 2.1 Auth
- [ ] Cadastro com e-mail novo, apelido válido e senha ≥ 8 → perfil criado (trigger).
- [ ] Apelido com < 3 ou > 20 caracteres, com caracteres de controle ou duplicado (mesmo variando maiúsc./minúsc.) → rejeitado com mensagem pt-BR.
- [ ] Login, logout e `router.refresh()` no header.
- [ ] Recuperação de senha: `/recuperar-senha` → e-mail → `/auth/callback` → `/redefinir-senha` → login com a nova senha.
- [ ] `next` de redirect só aceita caminho interno (testar `?next=https://evil.example`).
- [ ] `/quiz` e `/resumo` sem sessão redirecionam para `/login?next=...`.

### 2.2 Quiz (motor)
- [ ] Sessão tem 10 questões, 2 por nível, em ordem crescente de nível; 4 opções rotuladas A–D.
- [ ] Distribuição de assuntos ≈ 3/3/4 (best-effort).
- [ ] Payload da pergunta **não** contém gabarito/`is_correct`/explicação (inspecionar resposta em DevTools → Network).
- [ ] Refresh no meio do quiz abandona a sessão e inicia outra; a abandonada **não** aparece no ranking.
- [ ] Resposta em ~19 s conta; enviar a resposta logo após 20 s é computada como **erro** mesmo com o cliente mostrando tempo (validar com Network throttling/latência).
- [ ] Feedback mostra correta, sua resposta e explicação; o intervalo de feedback **não** é cronometrado.
- [ ] Sair da tela e voltar: nova sessão (sem retomada).
- [ ] Completar 10 questões → `/resumo`.

### 2.3 Resumo e ranking
- [ ] `/resumo` mostra placar, itens com resposta correta/sua resposta/explicação; questão não respondida aparece como **“Não respondida”**.
- [ ] Sessão abandonada no resumo: “Sessão encerrada”, **não** rankeada.
- [ ] `/ranking` mostra Top 10, uma linha por usuário (melhor pontuação), empate por conquista mais antiga e depois por apelido (case-insensitive), e a posição do usuário logado mesmo fora do Top 10.
- [ ] Ranking é público e **nunca** exibe e-mail.

### 2.4 Estados de erro
- [ ] `/ranking` e `/resumo` com RPC falhando mostram aviso amigável + “Tentar novamente”.
- [ ] Falha de rede no quiz mostra painel de erro com “Tentar novamente”/“Voltar ao início”.
- [ ] Rate limit: 21 inícios em 1 hora → `RATE_LIMITED` (429) com mensagem pt-BR.

**Aceite:** todos os itens marcados com evidência (data, ambiente, resultado). Qualquer falha vira correção de código/migration antes do deploy.

---

## 3. P2 — Segurança

- [ ] **P2.1 — Desvio `HttpOnly` (PD43).** Decidir e registrar: (a) manter `@supabase/ssr` com cookies não-`HttpOnly` + justificativa formal em `SECURITY.md`/README, ou (b) migrar para um fluxo que não exija o cookie visível ao browser. Não declarar conformidade total enquanto não decidido.
- [ ] **P2.2 — Service role.** Confirmar que `SUPABASE_SERVICE_ROLE_KEY` não aparece em `src/` nem nos envs da Vercel; existe apenas em `.env.local` e nos scripts locais.
- [ ] **P2.3 — Headers/CSP.** Rodar `npm run build && npm start` e conferir `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy` e HSTS (produção) em `next.config.ts`.
- [ ] **P2.4 — E-mail nunca exposto.** Grep por `email` nas respostas de RPC/rotas e inspeção do payload de `/api/ranking` e do resumo.
- [ ] **P2.5 — CSRF.** Confirmar que origem cruzada é rejeitada (`INVALID_ORIGIN`) e que localhost só é aceito fora de produção.
- [ ] **P2.6 — Ownership.** Confirmar que cada mutation de sessão valida `auth.uid()` (não é possível responder/avançar sessão de outro usuário nem com cookie manipulado).

---

## 4. P3 — UI, acessibilidade e performance

- [ ] Responsivo em 360, 768 e 1280 px (home, auth, quiz, resumo, ranking).
- [ ] Navegação só por teclado em todas as telas; foco visível; opções do quiz são `<button>` reais.
- [ ] Acerto/erro usam **ícone + texto**, nunca só cor; contraste ≥ 4,5:1.
- [ ] `prefers-reduced-motion` respeitado; timer com `role="timer"` sem `aria-live` por segundo.
- [ ] Lighthouse a11y ≥ 90 nas telas principais (home, quiz, resumo, ranking, login/cadastro) — D63.
- [ ] Start percebido < 300 ms p95 (medido no DevTools) — D62; ranking em 1 requisição HTTP.
- [ ] Opções 2×2 no desktop e 1 coluna no mobile; rótulos em sentence case (sem `uppercase` exceto cabeçalho da tabela).

---

## 5. P4 — Deploy (F8)

**Supabase (produção):**
- [ ] Projeto de produção; `db push` das mesmas migrations.
- [ ] Auth: **confirmação de e-mail ligada**; `Site URL` e redirects de produção (`/auth/callback`, `/redefinir-senha`); senha mínima 8; provedores não usados desabilitados.
- [ ] Seed de produção **somente questões**, `meta.reviewed_by` preenchido; nenhum usuário fictício.
- [ ] `scripts/verify-security.sql` no projeto de produção.

**Vercel:**
- [ ] Projeto Next.js, Node 22, conectado ao repositório.
- [ ] Env somente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. **Sem** service role.
- [ ] Deploy em `*.vercel.app` (sem domínio próprio); headers/CSP ativos; cookies `Secure`.

**Checklist pós-deploy (D56):** sessões não editáveis pelo cliente; RLS deny-all sem policies; `anon`/`authenticated` não leem o gabarito; RPCs exigem `auth.uid()`; seed de produção sem dados de teste; e-mail nunca exposto; fluxo manual completo; Lighthouse ≥ 90; start < 300 ms p95.

**Rollback:** Vercel → redeploy anterior; banco → nova migration forward-only (nada destrutivo sem backup).

---

## 6. P5 — Encerramento

- [ ] Atualizar `pod.md` (status v1.2 — fases concluídas com evidência) e `README.md` (status de verificação real).
- [ ] Registrar os itens executados do §17 de `pod.md` (definição de pronto) com evidência.
- [ ] Primeiro commit git **somente se o usuário pedir** (hoje o repositório não tem commits).
- [ ] Fechar as decisões abertas do §7 abaixo.

---

## 7. Decisões abertas (dependem do usuário)

| # | Decisão | Opções | Impacto |
| --- | --- | --- | --- |
| DA1 | Cookies de auth não-`HttpOnly` (PD43) | manter + justificar, ou mudar o fluxo de auth | segurança/arquitetura |
| DA2 | Revisão das questões | revisar no lugar vs. reescrever questões específicas | prazo do gate F6 |
| DA3 | TTL de abandono | manter 2 h (lazy) vs. outro valor | comportamento de sessão |
| DA4 | SMTP | serviço de e-mail do Supabase vs. SMTP externo | exige autorização de host externo |
| DA5 | Escopo do deploy | manter `*.vercel.app` sem domínio próprio (prd) | infra |

---

## 8. Comandos rápidos de verificação

```bash
npm run typecheck
npm run lint
npm run build
npm run seed -- --dry-run --env=dev
npm run seed -- --dry-run --env=production   # só passa após P0.3
```
