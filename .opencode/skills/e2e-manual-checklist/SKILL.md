---
name: e2e-manual-checklist
description: Checklist manual ponta a ponta do OpenCode Quiz em dev — auth, motor do quiz, resumo, ranking, estados de erro, a11y e performance. Use quando pedirem para testar o app, validar uma mudança de verdade no navegador ou declarar uma feature pronta.
---

# E2E Manual — OpenCode Quiz

Este projeto **não tem suíte automatizada** (decisão registrada). A verificação ponta a ponta é manual, e o valor dela depende de uma regra: **não afirme teste sem execução.** `SECURITY.md` §4 prevalece.

## Regra zero

Registre cada item com **data, ambiente e resultado**. "Funcionou" não é evidência; `POST /api/quiz/answer → 200` é.

Ambiente: `npm run dev` contra o projeto Supabase de **dev** (`tcpmvnxjegitfktdbcjo`). Nunca aponte `.env.local` para outro lugar.

## Preparação

- `npm run dev` com o servidor exposto em `http://localhost:3000`.
- DevTools aberto: **Network** (Preserve log ligado) e **Console**.
- Conta de teste. Não reutilize conta com quiz em andamento: o novo start abandona o anterior.
- Se for mexer em DDL: `scripts/verify-security.sql` antes de começar.
- Teste em **desktop e celular real** quando a mudança tocar formulário, layout ou teclado. O BUG-007 só apareceu no hardware.

## Bloco A — Auth

| # | Verificação | Evidência |
| --- | --- | --- |
| A1 | Cadastro novo → perfil criado pelo trigger | `auth.users` = `profiles` |
| A2 | Apelido com < 3 ou > 20, com caractere de controle, ou duplicado (variando maiúsc./minúsc.) é rejeitado com mensagem pt-BR | resposta + texto na tela |
| A3 | Login, logout e `router.refresh()` no header | header muda de "Entrar" para "Sair" |
| A4 | Recuperação: `/recuperar-senha` → e-mail → `/auth/callback` → `/redefinir-senha` → login com a senha nova | nunca executada ainda |
| A5 | `?next=https://evil.example` é recusado; só caminho interno é aceito | URL final após login |
| A6 | `/quiz` e `/resumo` sem sessão redirecionam para `/login?next=...` | status + URL |
| A7 | Botão de submit fica `disabled` antes da hidratação nas **quatro** telas de auth | view-source: sem `name` nos inputs; sem `GET /cadastro?` no log |

A4 é o buraco conhecido: no deploy público o link **não** chega utilizável (Site URL é `localhost`, allow list vazia). Isso é aceito por DA8 — registre como não medido, não como bug.

## Bloco B — Motor do quiz

| # | Verificação | Evidência |
| --- | --- | --- |
| B1 | 10 questões, 2 por nível, ordem crescente de nível | payload / tela |
| B2 | 4 opções rotuladas A–D, 1 correta | tela |
| B3 | Distribuição de assuntos ≈ 3/3/4 (best-effort) | idem |
| B4 | Payload da pergunta **não** contém `is_correct`, gabarito nem explicação | DevTools → Network → resposta de `start`/`advance` |
| B5 | Refresh no meio abandona a sessão e inicia outra; a abandonada **não** aparece no ranking | `quiz_sessions.status` |
| B6 | Resposta em ~19 s conta; logo após 20 s é **erro**, mesmo com o cliente mostrando tempo | throttling/latência |
| B7 | Feedback mostra correta, sua resposta e explicação; o intervalo de feedback **não** é cronometrado | esperar parado e avançar |
| B8 | Sair da tela e voltar inicia sessão nova (sem retomada) | log |
| B9 | 10 respostas → `/resumo` | 10 `answer` + 10 `advance` no log |

B6 é o item mais fácil de "passar" por acidente: sem atraso artificial, você nunca chega perto do limite. Force com Network throttling ou pausa no debugger.

## Bloco C — Resumo e ranking

| # | Verificação | Evidência |
| --- | --- | --- |
| C1 | Placar, item com sua resposta, resposta correta e explicação | tela |
| C2 | Questão não respondida aparece como **"Não respondida"** | tela |
| C3 | Sessão abandonada: "Sessão encerrada" e **não** rankeada | `rpc_public_ranking` |
| C4 | Top 10 com uma linha por usuário (melhor pontuação) | payload |
| C5 | Empate: conquista mais antiga, depois apelido case-insensitive | dois usuários com mesma nota |
| C6 | Posição do usuário logado aparece **mesmo fora** do Top 10 | conta nova |
| C7 | Ranking é público e **nunca** exibe e-mail | inspeção do payload, não só grep |

## Bloco D — Estados de erro

| # | Verificação | Evidência |
| --- | --- | --- |
| D1 | RPC falhando em `/ranking` e `/resumo` → aviso amigável + "Tentar novamente" | desligar rede / forçar erro |
| D2 | Falha de rede no quiz → painel com "Tentar novamente" / "Voltar ao início" | idem |
| D3 | 21 inícios em 1 hora → `RATE_LIMITED` (429) com mensagem pt-BR | status + texto |

Mensagens vivem em `src/lib/quiz/errors.ts`. Se o texto na tela divergir de `ERROR_MESSAGES`, é defeito — não "sinônimo aceitável".

## Bloco E — Segurança observável

- `POST /api/quiz/start` com `Origin` cruzada → **403** `INVALID_ORIGIN`.
- Manipular o cookie `oq_quiz_session` para o UUID de outra sessão → negado (ownership é `auth.uid()` no banco).
- `npm run build && npm start` → conferir `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy` e HSTS.
- `anonymous` lendo tabela direto → `42501 permission denied`.

## Bloco F — A11y e performance

- Fluxo completo só por teclado; foco visível em tudo.
- Acerto/erro por **ícone + texto**, nunca só cor; contraste ≥ 4,5:1.
- `prefers-reduced-motion` respeitado; timer com `role="timer"` e sem `aria-live` por segundo.
- 360 / 768 / 1280 px: opções 2×2 no desktop, 1 coluna no mobile.
- Lighthouse a11y ≥ 90 em home, auth, quiz, resumo e ranking (D63).
- Start percebido < 300 ms p95 (D62), medido no DevTools; ranking em 1 requisição HTTP.

## Defeito encontrado

Não conserte em silêncio. Abra entrada em `bug_log.md` com: sintoma, passos de reprodução, evidência (log/print/status), ambiente e **critério de aceite**. Depois da correção, re-rode o item e anote a data.

Um bug corrigido sem registro volta.

## Antes de terminar

- [ ] Cada item executado está marcado com data, ambiente e resultado.
- [ ] Itens não executados estão declarados como **não medidos** — nunca inferidos.
- [ ] Nenhuma conta, senha ou e-mail real entrou em log ou doc.
- [ ] Defeitos registrados em `bug_log.md` com critério de aceite.
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` passam **com o dev server parado**.
- [ ] Se houve DDL, `scripts/verify-security.sql` rodou de novo.
- [ ] `git status` conferido: nada de `.env.local` ou artefato de build no commit.
