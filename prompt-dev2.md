# prompt-dev2.md — retomada do desenvolvimento

> Como usar: abra uma sessão nova **na mesma pasta do projeto** e cole o bloco abaixo.
> Este arquivo não é um plano: o plano está em `pod_v2.md`; estado, comandos e regras estão em `AGENTS.md`.

---

## Prompt

Retome o desenvolvimento do OpenCode Quiz a partir do estado atual.

**Leia antes de agir:** `AGENTS.md` (estado do repo, comandos, regras), `pod_v2.md` (o que falta, prioridade P0→P5), `pod.md` §12.1 e §19 (evidências e snapshot), `prd.md` §10 (rubric das questões). Precedência: `SECURITY.md` > `prd.md` > `pod.md` > `pod_v2.md` > `AGENTS.md`.

**Ponto de partida (2026-10-20):** o projeto Supabase **dev** está migrado (5/5), semeado (200 questões), a RLS foi auditada e as 200 questões têm revisão humana registrada. O que falta está em `pod_v2.md` §9: teste do BUG-002 no celular, checklist manual E2E, a11y/perf, decisões DA3/DA4/DA5 e o deploy (F8). Não refaça o que já está marcado como feito.

**Entradas que só eu posso dar — pergunte antes de precisar delas:**

1. Autorização para **cada commit** (o repositório já está publicado em `main`, com branch protegida).
2. As **decisões DA3, DA4 e DA5** (`pod_v2.md` §8).
3. Dados de **produção**: criação dos projetos Supabase e Vercel e as chaves correspondentes.
4. Respostas do **BUG-002** sobre o formulário em branco no Android.

**Ao concluir cada item:** atualize os checkboxes correspondentes em `pod_v2.md` e registre a evidência (comando + resultado real). Se algo falhar, mostre a mensagem e corrija por **nova** migration — nunca editando migration já aplicada.

**Não faça:** ampliar escopo, adicionar testes automatizados, commitar sem minha autorização, rodar seed de produção sem o nome do revisor. Regras completas em `AGENTS.md` (`## Scope` e `## Security constraints`).

**Relatório final:** o que executou, o que não executou e por qual bloqueio. Não afirme verificação que não rodou.
