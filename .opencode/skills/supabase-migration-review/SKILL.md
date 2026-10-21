---
name: supabase-migration-review
description: Revisa migrations Supabase do OpenCode Quiz antes de aplicar — RLS deny-all, RPC security definer com search_path fixo, grants, ownership e regra forward-only. Use ao criar ou alterar arquivos em supabase/migrations, ao revisar DDL/SQL e antes de rodar npx supabase db push.
---

# Supabase Migration Review — OpenCode Quiz

Revise a migration **antes** de aplicá-la. `SECURITY.md` e `AGENTS.md` prevalecem sobre este skill; ele cobre execução, não redefine escopo.

## Quando usar

- Um arquivo novo apareceu em `supabase/migrations/`.
- Existe DDL, função, trigger, índice ou `grant` para revisar.
- Antes de `npx supabase db push`, e depois dele para provar o estado.

**Não use para:** seed do banco de questões (é `npm run seed`), mudança de rota em TypeScript, ou revisão de UI.

## Invariantes do banco

Quebrar qualquer linha abaixo é **bloqueio**, não ressalva.

| # | Invariante | Onde se prova |
| --- | --- | --- |
| 1 | RLS ligada em toda tabela `public` | `pg_class.relrowsecurity` |
| 2 | **Zero policies** em `public` (deny-all) | `pg_policies` = 0 |
| 3 | Função exposta ao cliente é `security definer` **com** `set search_path = ''` | `pg_proc.prosecdef` + `proconfig` |
| 4 | Dentro das funções, todo objeto é qualificado (`public.tabela`) | leitura do corpo |
| 5 | `anon` executa **só** `rpc_public_ranking` e `rpc_check_nickname` | `has_function_privilege` |
| 6 | `authenticated` não executa função interna (`select_session_questions`, `build_*`, `abandon_session`) | idem |
| 7 | Ownership é sempre `auth.uid()`; nunca parâmetro, corpo ou cookie | leitura do corpo |
| 8 | `is_correct` não é projetado fora de `rpc_submit_answer` / `build_feedback` / `build_summary` | `rg is_correct src/` |
| 9 | Abandono por TTL devolve sentinela JSON, **não** `raise exception` | `jsonb_build_object('state','error','code','SESSION_CLOSED')` |
| 10 | Questão ativa tem 9 opções e exatamente 1 correta | trigger `assert_question_shape` |

## Procedimento

1. **Leia a migration inteira**, não o diff. Arquivo SQL curto engana.
2. **Classifique:** aditiva (segura) · destrutiva (`drop`/`alter type`) · de dados (backfill) · de função (a mais arriscada).
3. **Confirme forward-only.** Se o arquivo já está aplicado no remoto, **pare**: criar arquivo novo, nunca editar. Timestamp novo, UTC, maior que `20261019000500`, formato `YYYYMMDDHHMMSS_nome_snake_case.sql`.
4. **Varra grants.** Toda função nova nasce executável por `public` em Postgres — revogue explicitamente o que não deve ser público.
5. **Verifique `search_path`** em cada função nova. `security definer` sem ele é escalada de privilégio.
6. **Olhe os dados.** Migration não insere questão, usuário fictício nem sessão de teste. O único caminho de escrita do banco de questões é `seed_question` / `seed_finalize`.
7. **Pense em lock.** 200 linhas não justifica pressa, mas `alter table` com reescrita + backfill na mesma transação segura escrita. `create index concurrently` **não roda dentro de transação**, e o `db push` roda em transação — decida explicitamente (lock curto ou passo separado).
8. **Rode as verificações** da seção seguinte.
9. **Aplique** e prove o estado.
10. **Registre** o que foi executado, com data e saída.

## Comandos de varredura

```bash
rg -n "create policy|drop policy" supabase/migrations   # esperado: nada
rg -n "create (or replace )?function" -A4 supabase/migrations/<novo>.sql
rg -n "grant |revoke " supabase/migrations/<novo>.sql
rg -n "is_correct" src/                                  # esperado: nada
rg -n "SUPABASE_SERVICE_ROLE_KEY" src/ supabase/         # esperado: nada
```

Checagem de `search_path` (deve devolver 0 linhas):

```sql
select p.oid::regprocedure
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and (p.proconfig is null
       or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
```

## Aplicar e provar

```bash
npx supabase migration list --linked   # antes: 5/5
npx supabase db push
npx supabase migration list --linked   # depois: local = remoto
```

Depois de qualquer DDL, `scripts/verify-security.sql` **precisa** rodar de novo. Nesta máquina não há `psql` nem Docker: o script vai pela Management API (`POST /v1/projects/{ref}/database/query`). Lembre que esse endpoint não devolve `NOTICE` — "passou" significa "não levantou exceção", corroborado pelas contagens.

## Erros recorrentes neste projeto

- **Criar policy "temporária" para testar.** Aqui não existe policy por linha; o padrão `owner = auth.uid()` é justamente o que o projeto rejeitou.
- **Esquecer `set search_path = ''`** numa função nova. `verify-security.sql` pega — se você rodar.
- **Conceder `execute` a `authenticated` em helper interno.** O script só testa nomes conhecidos; função nova escapa da rede.
- **`raise exception` no abandono por TTL.** A exceção desfaz o abandono junto com a transação. Use o sentinela JSON.
- **Editar migration já aplicada.** Em dev parece inofensivo; em produção é divergência silenciosa.
- **Inserir dados de teste em migration.** O `db push` de produção levaria o lixo junto (gate D26 e a regra de seed limpo).
- **`on delete cascade` amplo** em tabela que guarda histórico de sessão.
- **Reaproveitar timestamp de migration existente.** Ordem de aplicação vira loteria.

## Formato do relatório

```
Veredito: OK | OK com ressalvas | BLOQUEADO
Achados: [bloqueio|alto|médio|baixo] <arquivo>:<linha> — <problema> — <correção>
Aplicado: <sim|não> · migration list: <antes> → <depois> · verify-security: <passou|não rodou>
```

## Antes de terminar

- [ ] Nenhuma policy criada; RLS continua ligada nas 9 tabelas.
- [ ] Toda função nova é `security definer` com `search_path = ''` e objetos qualificados.
- [ ] Grants revisados: `anon` e `authenticated` só alcançam o que precisam.
- [ ] Ownership via `auth.uid()` em toda mutation nova.
- [ ] Nenhuma credencial, dado de teste ou `is_correct` novo saindo para o cliente.
- [ ] Arquivo novo (forward-only), timestamp único e UTC.
- [ ] `npx supabase migration list --linked` mostra local = remoto.
- [ ] `scripts/verify-security.sql` rodou **depois** do DDL e não levantou exceção.
- [ ] Nada foi declarado como verificado sem a saída do comando.
