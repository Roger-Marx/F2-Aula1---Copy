# prompt-dev2.md — retomada do desenvolvimento

> Como usar: abra uma sessão nova **na mesma pasta do projeto** e cole o bloco abaixo.
> Este arquivo não é um plano: o plano está em `pod_v2.md`; estado, comandos e regras estão em `AGENTS.md`.
> Última atualização: 2026-10-20, commit `c10f98d` (árvore limpa, `main` em sincronia com `origin/main`).

---

## Prompt

Retome o desenvolvimento do OpenCode Quiz a partir do estado atual.

**Leia antes de agir:** `AGENTS.md` (estado do repo, comandos, regras), `pod_v2.md` (o que falta, prioridade P0→P5), `pod.md` §12.1 e §19 (evidências e snapshot), `prd.md` §10 (rubric das questões). Precedência: `SECURITY.md` > `prd.md` > `pod.md` > `pod_v2.md` > `AGENTS.md`.

### Ponto de partida (2026-10-20, commit `c10f98d`)

- Supabase **dev** (`tcpmvnxjegitfktdbcjo`) migrado 5/5, 200 questões semeadas, RLS/grants auditados (`verify-security.sql` passou) e revisão humana das questões atestada (`meta.reviewed_by = "Roger_Marx"`, dry-run de produção exit 0).
- `npm run typecheck`, `npm run lint` e `npm run build` passam (17 rotas, proxy presente).
- **Nenhum defeito aberto**: BUG-001 a BUG-007 verificados. O BUG-002 (login no Android) teve causa raiz confirmada e foi corrigido no BUG-007.
- Fluxo de auth/quiz/resumo/ranking **verificado no PC e no celular** (cadastro, login, 10 respostas, resumo, ranking). Dados de dev: `auth.users` = 7, `profiles` = 7, `quiz_sessions` = 8, `question_views` = 80 — as 5 contas criadas no teste (`roger`, `abacaxi`, `queijo`, `pedro`, `Biazoca`) são dados de teste, não de produção.
- O que falta está em `pod_v2.md` §9. **Não refaça o que já está marcado como feito.**

### O que fazer, em ordem

| # | Item | Como fazer | Critério de aceite |
| --- | --- | --- | --- |
| 1 | **Recuperação de senha** — o único fluxo de auth nunca executado | Comece pela rota sem depender de SMTP: `POST /auth/v1/admin/generate_link` (`type=recovery`) com a service role de `.env.local` gera o link; abra no navegador e valide `/auth/callback` → `/redefinir-senha` → login com a senha nova. Depois, se quiser medir entrega real de e-mail, crie uma conta com um e-mail que você acessa e use `/recuperar-senha`. | Senha trocada e login com ela funciona; link inválido/expirado mostra mensagem pt-BR; registrar se o e-mail chegou (insumo de DA4) |
| 2 | **Restante do checklist manual** (`pod_v2.md` §3) | Apelido com < 3 / > 20 / duplicado variando maiúsc.; resposta na fronteira dos 20 s (latência no DevTools); refresh no meio do quiz (abandona e começa outra, não rankeia); `?next=https://evil.example` recusado; `/quiz` e `/resumo` sem sessão → `/login?next=…` | Cada item marcado no `pod_v2.md` com data e resultado real |
| 3 | **A11y e performance** (`pod_v2.md` §5) | Lighthouse no build de produção (`npm run build` + `npm start`, **pare o dev antes**) em `/`, `/login`, `/quiz`, `/ranking`; navegação só por teclado; contraste; foco visível | Números registrados e, se houver falha, corrigida sem trocar a linguagem visual |
| 4 | **Decisões DA3/DA4/DA5** (`pod_v2.md` §8) | DA3 = TTL/expiração da sessão; DA4 = SMTP de produção; DA5 = escopo do deploy | Decisão escrita no `pod_v2.md` com data |
| 5 | **Deploy F8** | Supabase de produção (confirmação de e-mail **ligada**, D45) → Vercel (Node 22, 3 envs) → `db push` + seed de produção + `verify-security.sql` na produção | Produção no ar com seed sem dados de teste e auditoria aprovada |

Itens 1 e 2 são de **execução sua** no navegador; o agente prepara o ambiente, acompanha o log do servidor e registra a evidência.

### Ambiente

```bash
npm run dev            # http://localhost:3000 e http://192.168.0.65:3000 (celular)
npm run typecheck
npm run lint
npm run build          # pare o dev antes: os dois usam .next
```

- Node 22, npm; Supabase CLI autenticada (`npx supabase migration list --linked` deve mostrar 5/5).
- Token da Management API, se precisar consultar o banco: Windows Credential Manager, alvo `Supabase CLI:supabase`, blob em **UTF-8**. O runner vive fora do repo (`%TEMP%\opencode\pgclient`).
- **O repositório é público (DA6):** nenhuma credencial pode entrar no histórico. `.env.local` fica fora do Git; só `.env.example` com placeholders é versionado.

### Armadilhas conhecidas — não redescobrir

- **Hidratação (BUG-007):** `event.preventDefault()` não existe antes de o React hidratar. Todo formulário novo precisa do hook `useHydrated()` (`src/lib/use-hydrated.ts`) mantendo o botão de envio `disabled` até hidratar.
- Os inputs **não têm `name` de propósito**: evita vazar e-mail/senha na URL em envio nativo. Não adicione `name`.
- Esta versão do Next é a **16**: o arquivo é `src/proxy.ts`, **não** `middleware.ts`; leia os guias em `node_modules/next/dist/docs/` antes de codar.
- Quiz: tabelas com RLS deny-all; acesso só por RPCs `security definer` com `search_path = ''`; gabarito nunca vai ao cliente antes da resposta.
- Abandono por TTL devolve **sentinela JSON** (`{"state":"error","code":"SESSION_CLOSED"}`), não `raise exception`; não existe `sweep_stale_session`.
- Cookies de auth do `@supabase/ssr` **não** são `HttpOnly` (DA1 aceita — não reabrir); o `oq_quiz_session` é.
- Colunas: `levels`/`subjects` usam `name_pt`; `question_views` tem PK composta (`user_id`, `question_id`).
- PowerShell trata stderr do git como erro (exit 1 em push bem-sucedido) — confira a linha `old..new main -> main`. Use `Invoke-WebRequest -UseBasicParsing`.
- O Next 16 bloqueia `/_next/hmr` de outra origem: no celular via LAN aparece `Blocked cross-origin request` e a hidratação fica mais lenta. Não afeta a aplicação; liberar exige `allowedDevOrigins` no `next.config.ts` (só dev, IP muda por rede).
- **Sem suíte de testes automatizados** (decisão do projeto): não adicionar Vitest/Playwright.
- Gate **D26**: não autoaprovar questões; o seed de produção falha fechado com `reviewed_by` genérico.

### Entradas que só eu posso dar — pergunte antes de precisar delas

1. Autorização para **cada commit** (repo publicado em `main`, branch protegida contra force-push).
2. As **decisões DA3, DA4 e DA5** (`pod_v2.md` §8).
3. Dados de **produção**: criação dos projetos Supabase e Vercel e as chaves correspondentes.
4. Para o teste de recuperação de senha: qual e-mail real posso usar, se você quiser validar a entrega pelo SMTP.

### Ao concluir cada item

Atualize os checkboxes de `pod_v2.md` e registre a evidência (comando + resultado real). Se algo falhar, mostre a mensagem e corrija por **nova** migration — nunca editando migration já aplicada.

**Não faça:** ampliar escopo, adicionar testes automatizados, commitar sem minha autorização, rodar seed de produção sem o nome do revisor. Regras completas em `AGENTS.md` (`## Scope` e `## Security constraints`).

**Relatório final:** o que executou, o que não executou e por qual bloqueio. Não afirme verificação que não rodou.
