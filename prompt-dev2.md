# prompt-dev2.md — retomada do desenvolvimento

> Como usar: abra uma sessão nova **na mesma pasta do projeto** e cole o bloco abaixo.
> Este arquivo não é um plano: o plano está em `pod_v2.md`; estado, comandos e regras estão em `AGENTS.md`.

---

## Prompt

Retome o desenvolvimento do OpenCode Quiz a partir do estado atual.

**Leia antes de agir:** `AGENTS.md` (estado do repo, comandos, regras), `pod_v2.md` (o que falta, prioridade P0→P5), `pod.md` §12.1 e §19 (evidências e snapshot), `prd.md` §10 (rubric das questões). Precedência: `SECURITY.md` > `prd.md` > `pod.md` > `pod_v2.md` > `AGENTS.md`.

**Ponto de partida:** o Supabase já está configurado e vinculado, mas o banco remoto está **vazio** — falta aplicar as migrations. Comece por `pod_v2.md` §1 (P0), na ordem P0.1 → P0.2 → P0.3. Não refaça F0/F1 nem o que já está marcado como feito.

**Entradas que só eu posso dar — pergunte antes de precisar delas:**

1. O **nome do revisor humano** para `meta.reviewed_by` em `supabase/seed/questions.json` (hoje `"Automático"`, que contraria o gate D26). Só troque com o nome que eu informar.
2. Autorização para o **commit inicial** (repo sem commits; git local, sem remoto).
3. Se este projeto Supabase é **dev** ou **produção** — define se `npm run seed:dev-users` entra no fluxo.

**Ao concluir cada item:** atualize os checkboxes correspondentes em `pod_v2.md` e registre a evidência (comando + resultado real). Se algo falhar, mostre a mensagem e corrija por **nova** migration — nunca editando migration já aplicada.

**Não faça:** ampliar escopo, adicionar testes automatizados, commitar sem minha autorização, rodar seed de produção sem o nome do revisor. Regras completas em `AGENTS.md` (`## Scope` e `## Security constraints`).

**Relatório final:** o que executou, o que não executou e por qual bloqueio. Não afirme verificação que não rodou.
