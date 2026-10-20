# bug_log.md

Log de defeitos do OpenCode Quiz, alimentado pelo **teste manual** e por inspeção de código/banco.
Complementa (não substitui) `pod_v2.md` — lá estão as *pendências de trabalho*, aqui estão os *defeitos encontrados*.

## Como usar

- Um registro por defeito, com ID estável (`BUG-001`, `BUG-002`, …). **Nunca** reutilizar nem apagar um ID: se o defeito não existe, mude o status para `Descartado` explicando.
- Todo defeito tem **evidência** (comando/SQL/tela) e **critério de aceite** verificável. Sem isso, não é um defeito — é uma suspeita (use o status `Suspeita`).
- Ao corrigir, preencher a seção **Correção aplicada** com data, arquivo(s) e como foi verificado, e mudar o status para `Verificado`.
- Nunca incluir e-mail, senha ou chave neste arquivo. Identifique pessoas por `id` truncado e apelido.

**Status:** `Aberto` · `Aguardando informação` · `Suspeita` · `Corrigindo` · `Corrigido` · `Verificado` · `Descartado`
**Severidade:** `S1` bloqueia fluxo principal · `S2` atrapalha ou engana · `S3` estético/cosmético

## Índice

| ID | Título | Sev. | Status |
| --- | --- | --- | --- |
| BUG-001 | Resultado do quiz não aparece no ranking (usuário sem `profile`) | S1 | Verificado |
| BUG-002 | Login no Chrome Android não entra e o formulário volta vazio | S1 | Aguardando informação |
| BUG-003 | Mensagem de erro do login não distingue e-mail não confirmado | S2 | Verificado |
| BUG-004 | Confirmação de e-mail divergente: `config.toml` diz off, projeto dev exige on | S2 | Verificado |
| BUG-005 | Logado, o header continua mostrando "Entrar" (e nenhum "Sair") | S2 | Verificado |
| BUG-006 | Gate D26 furado: seed de produção passava com `reviewed_by = "Automático"` | S1 | Verificado |

---

## BUG-001 — Resultado do quiz não aparece no ranking (usuário sem `profile`)

- **Severidade:** S1 · **Status:** Verificado (2026-10-20)
- **Reportado por:** teste manual, 2026-10-19
- **Ambiente:** máquina local, `http://localhost:3000`; usuário de dev `dev-ana` (id `d9353b86…`); projeto Supabase dev `tcpmvnxjegitfktdbcjo`

**Passos para reproduzir**

1. Entrar com um usuário de dev válido.
2. Jogar as 10 questões do quiz.
3. Conferir o ranking.

**Esperado:** o usuário aparece no ranking com 8 de 10.
**Observado:** o ranking continua vazio (`{top: [], me: null}`), como se nada tivesse sido jogado.

**Evidência (leitura direta do banco, 2026-10-19)**

- `quiz_sessions` = `e5ec73a7…` — `user_id = d9353b86…`, `status = completed`, **`score = 8`**, `completed_at = 20:32:51`, 10/10 questões respondidas, 8 corretas, 0 timeout.
  → **O quiz terminou certo e o placar foi gravado.** O defeito não está no cálculo nem no fluxo do quiz.
- `profiles` = **1 única linha**, do usuário `118348d3…` (apelido `roger`). **Não existe profile para `d9353b86…`** nem para o outro usuário de dev.
- `rpc_public_ranking()` faz `join public.profiles p on p.id = b.user_id` (inner) em `supabase/migrations/20261019000200_functions.sql:841` → sessões de usuários **sem profile são silenciosamente descartadas** do ranking.

**Causa raiz**

O profile é criado exclusivamente pelo trigger `on_auth_user_created` → `public.handle_new_user()` (`supabase/migrations/20261019000200_functions.sql:17-45`), que só dispara no **INSERT** em `auth.users`. Os dois usuários de dev (`dev-ana`, `dev-bruno`) foram criados às **19:09:37/38**, ambos com `email_confirm: true` e `user_metadata.nickname` preenchido — assinatura de `scripts/seed-dev-users.ts` — **antes de o `db push` aplicar as migrations**. Quando o schema passou a existir, eles já existiam; nunca ganharam profile. O metadata tem apelido válido, o que confirma que o trigger simplesmente não existia naquele momento.

Agravante: `scripts/seed-dev-users.ts:45-48` **pula** usuários já existentes (`continue`), então rodar o script de novo **não conserta** nada.

**Impacto:** qualquer usuário sem profile pode entrar, jogar, completar as 10 questões, ter o placar gravado — e **nunca** aparecer no ranking. Falha silenciosa, sem erro na tela. Afeta também contas criadas no dashboard do Supabase antes das migrations.

**Correção proposta** (duas partes, a decidir)

1. **Dados (dev):** backfill dos profiles faltantes. Executável no SQL Editor ou via service role:

   ```sql
   insert into public.profiles (id, nickname, normalized_nickname)
   select u.id,
          btrim(u.raw_user_meta_data ->> 'nickname'),
          public.normalize_nickname(u.raw_user_meta_data ->> 'nickname')
   from auth.users u
   where u.raw_user_meta_data ? 'nickname'
     and char_length(btrim(u.raw_user_meta_data ->> 'nickname')) between 3 and 20
     and not exists (select 1 from public.profiles p where p.id = u.id);
   ```

2. **Código:** `scripts/seed-dev-users.ts` passa a **garantir** o profile do usuário existente (inserir só se faltar, sem sobrescrever apelido), além de pular a criação da conta. Opcional e defensivo: `rpc_start_session` recusar com erro explícito quando o usuário não tem profile, para nunca gravar placar órfão.

**Critério de aceite**

- Depois do backfill, `rpc_public_ranking()` mostra `dev-ana` com 8 na posição 1.
- `npm run seed:dev-users` executado duas vezes deixa todos os usuários de dev com exatamente 1 profile.
- Um usuário sem profile não consegue completar uma sessão sem erro explícito (ou é reparado automaticamente).

**Correção aplicada (2026-10-20)**

1. **Dados:** `npm run seed:dev-users` reparou os 2 profiles faltantes (`Profile criado para dev-ana` / `dev-bruno (usuário já existia sem profile)`). `rpc_public_ranking()` passou a retornar `dev-ana` com `score 8` na `position 1`; `profiles` ficou com 3 linhas.
2. **Código:** `scripts/seed-dev-users.ts` agora consulta o profile do usuário existente e o cria se faltar (`hasProfile` / `createProfile`), e para **usuário novo** valida que o trigger `handle_new_user` criou o profile — se não criou, **falha alto** com mensagem apontando as migrations, em vez de deixar um usuário invisível.

**Verificado:** ranking com `dev-ana`/8; segunda execução do script responde "Usuário de dev já existe" nos dois, sem duplicar; `npm run typecheck`, `npm run lint` e `npm run build` (EXIT=0) passam.

**Não exercitado:** o caminho de erro "trigger não rodou em usuário novo" — testá-lo exigiria quebrar o schema de propósito.

**Não confundir com comportamento esperado:** a segunda sessão (`53650d93…`, mesmo usuário, `in_progress`, 1 respondida / 1 timeout, às 20:39) **não** deve aparecer no ranking — sessão em andamento ou abandonada não pontua (pod.md §6.7).

---

## BUG-002 — Login no Chrome Android não entra e o formulário volta vazio

- **Severidade:** S1 · **Status:** Aguardando informação
- **Reportado por:** teste manual, 2026-10-19
- **Ambiente:** Chrome para Android acessando `http://192.168.0.65:3000` (mesma rede, **sem HTTPS**)

**Passos para reproduzir**

1. Abrir `/login` no celular.
2. Preencher e-mail e senha.
3. Tocar em "Entrar".

**Esperado:** entrar e seguir para `/quiz` (ou para o `next` capturado pelo proxy).
**Observado:** a página permanece em `/login`, com os campos **e-mail e senha em branco**.

**Evidência**

- O projeto dev responde `mailer_autoconfirm: false` em `GET /auth/v1/settings` → **o login por senha é recusado enquanto o e-mail não for confirmado** (comportamento do GoTrue).
- `auth.users` tem 3 contas: duas confirmadas de dev e **uma não confirmada**, criada às 20:27:18, com profile `roger` e **`last_sign_in_at` nunca registrado** → o cadastro pelo celular criou a conta, mas aquele login **nunca** teve sucesso. (O trigger de profile funcionou nessa criação — o schema já existia.)
- `src/components/auth/LoginForm.tsx:54-56` converte **qualquer** falha do `signInWithPassword` em "E-mail ou senha inválidos." → o motivo real (`email_not_confirmed`) nunca chega ao usuário. Ver BUG-003.
- **Confirmado por API em 2026-10-20:** conta com `email_confirm: false` → `signInWithPassword` devolve `code = 'email_not_confirmed'`, HTTP 400 e **nenhuma sessão**. É exatamente o que deve ter acontecido no celular; resta explicar o formulário em branco (H2/H2b).

**Hipóteses**

- **H1 (ELIMINADA em 2026-10-20):** a conta usada no celular estava com e-mail **não confirmado** e o projeto exigia confirmação. O BUG-004 foi corrigido (`mailer_autoconfirm = true`) e o login por senha passou a funcionar por API; a conta `roger` foi **apagada** pelo usuário. Logo H1 não pode mais causar este sintoma — se ele reaparecer, é H2/H2b.
- **H2 (explica os campos vazios, precisa de confirmação):** o formulário foi enviado **antes da hidratação do React**. Em dev os bundles são grandes e no celular via LAN a hidratação demora; antes dela, o clique em "Entrar" faz o **submit nativo**, que recarrega `/login` do zero. Os inputs não têm atributo `name` (`src/components/ui/TextField.tsx` repassa só `id`), por isso a recarga é "limpa" — nada vaza na URL.
- **H2b (alternativa, mesma classe de sintoma):** autofill do Chrome Android preenchendo o DOM enquanto o estado React continua vazio (inputs controlados); no primeiro re-render os campos aparecem vazios e vale a validação `if (!email.trim() || !password)` → mensagem "Preencha e-mail e senha.".

**Informação necessária para fechar o diagnóstico**

1. Depois de tocar em "Entrar", a URL mudou ou a página recarregou, ou ficou exatamente igual?
2. Apareceu alguma mensagem em vermelho? Qual? Foi instantâneo ou demorou?
3. As credenciais digitadas no celular eram da conta criada no PC ou da conta criada no próprio celular (`roger`)?
4. O cadastro no celular mostrou a tela "Confirme seu e-mail"?
5. Os campos apareceram vazios **logo após** o clique, ou só depois de você recarregar?

**Critério de aceite:** login funciona no Android via `http://<ip-da-lan>:3000` com usuário confirmado; falha por e-mail não confirmado mostra mensagem específica (BUG-003).

---

## BUG-003 — Mensagem de erro do login não distingue e-mail não confirmado

- **Severidade:** S2 · **Status:** Verificado (2026-10-20)
- **Arquivo:** `src/components/auth/LoginForm.tsx:54-56`

**Observado:** `if (signInError) { setError("E-mail ou senha inválidos."); return; }` — toda falha, inclusive `email_not_confirmed`, vira "E-mail ou senha inválidos.". Quem só precisa confirmar o e-mail é levado a achar que errou a senha (e a tentar trocar a senha, ou pior, a recriar a conta).

**Correção proposta:** mapear `error.code` antes do fallback genérico:

- `email_not_confirmed` → "Confirme seu e-mail antes de entrar." (considerar botão/link de reenvio — hoje não existe no app);
- `invalid_credentials` → manter "E-mail ou senha inválidos.";
- `over_request_rate_limit` / `over_email_send_rate_limit` → "Muitas tentativas. Aguarde um minuto.";
- demais → mensagem genérica.

Manter pt-BR, sentence case, sem emojis e **sem ecoar o e-mail**.

**Critério de aceite:** com usuário não confirmado, a tela mostra a mensagem de confirmação; com senha errada, mantém "E-mail ou senha inválidos.".

**Correção aplicada (2026-10-20)** — `src/components/auth/LoginForm.tsx`

- Mapa `LOGIN_ERROR_MESSAGES` por `error.code`: `email_not_confirmed` → "Confirme seu e-mail antes de entrar."; `invalid_credentials` → "E-mail ou senha inválidos."; limites de taxa → "Muitas tentativas. Aguarde um minuto."; **qualquer outro código** (ou nenhum, ex. falha de rede) → "Não foi possível entrar. Tente novamente." — o fallback deixou de culpar a senha.
- Sem botão de reenvio de confirmação nesta rodada (não está no escopo aprovado).

**Verificado por API (não pela tela):** conta criada com `email_confirm: false` → `signInWithPassword` devolve `code = 'email_not_confirmed'`, HTTP 400, **nenhuma sessão**; senha errada → `code = 'invalid_credentials'`. Os dois códigos caem nas entradas corretas do mapa.

**Pendente:** conferir a renderização visual na próxima rodada de teste manual.

---

## BUG-004 — Confirmação de e-mail divergente: `config.toml` diz off, projeto dev exige on

- **Severidade:** S2 · **Status:** Verificado (2026-10-20)
- **Onde:** `supabase/config.toml:41` × configuração do projeto hospedado

**Observado:** `supabase/config.toml` tem `enable_confirmations = false` (e o pod.md §7.2 / D45 dizem que **dev** é sem confirmação), mas o projeto dev hospedado responde `mailer_autoconfirm: false` → **exige confirmação**. O `config.toml` vale apenas para a stack **local** (`supabase start`), que não é usada aqui; o projeto hospedado é governado pelo dashboard.

**Efeito:** cadastro pela web não loga (a tela "Confirme seu e-mail" aparece) e o e-mail pode **nunca chegar**: sem SMTP customizado, o serviço embutido do Supabase só entrega para endereços de membros do projeto.

**Correção proposta:** no dashboard, Authentication → Sign In / Providers → Email → desligar **"Confirm email"** no dev (alinha com o D45); manter **ligado** em produção. Registrar a decisão.

**Critério de aceite:** em dev, cadastro + login funcionam sem depender de e-mail; em produção, a confirmação permanece obrigatória.

**Correção aplicada (2026-10-20)** — configuração do projeto dev, via Management API (`PATCH /v1/projects/tcpmvnxjegitfktdbcjo/config/auth`)

- `mailer_autoconfirm`: `false → true` — em dev a confirmação deixa de ser exigida, alinhando com o D45.
- `site_url` segue `http://localhost:3000`, `disable_signup` segue `false`, `password_min_length` segue `8`.
- Mantido o `config.toml` como está: ele vale só para a stack local e documenta a intenção; o projeto hospedado é governado pelo dashboard/API.

**Nota de operação (erro de toggle, corrigido no mesmo dia):** na primeira tentativa, o toggle desligado no dashboard foi **"Enable email provider"** em vez de **"Confirm email"**. O projeto ficou com `external.email = false`, o que derruba **cadastro, login e recuperação de senha por completo** — inclusive os usuários de dev, que já estavam confirmados. Foi detectado ao ler `/auth/v1/settings` logo depois da mudança e revertido pela API. Sem impacto em produção (o projeto afetado é o dev). Os dois toggles ficam na mesma tela e têm nomes parecidos: um desliga o provedor inteiro, o outro só a exigência de confirmação.

**Verificado por API (não pela tela), em 2026-10-20**

- `/auth/v1/settings` → `external.email = true`, `mailer_autoconfirm = true`, `disable_signup = false`.
- Cadastro público de um usuário descartável (apagado em seguida): HTTP 200, `access_token` presente e `user.email_confirmed_at` já preenchido — o cadastro **nasce com sessão**, sem e-mail.
- Login com a mesma senha: HTTP 200, `token_type = bearer`.
- Senha de 7 caracteres: recusada com HTTP 422 — `password_min_length = 8` vale no servidor.
- Após a limpeza: `auth.users = 2`, `profiles = 2` (`dev-ana`, `dev-bruno`), sem linhas órfãs.

**Correção de premissa:** o Management API expõe `minimum_password_length` como campo derivado que volta vazio; o valor real está em `password_min_length` e **já era `8`**. O D44 nunca esteve violado no servidor — o `if (password.length < 8)` em `SignupForm.tsx:49` e `ResetForm.tsx:34` é defesa em profundidade, não a única barreira.

**Pendente:** repetir cadastro e login **pela tela**, no PC e no Android, na rodada de teste manual — é o que fecha o BUG-002 junto. Em produção a confirmação deve permanecer **ligada** (D45); o projeto de produção ainda não existe.

---

## BUG-005 — Logado, o header continua mostrando "Entrar" (e nenhum "Sair")

- **Severidade:** S2 · **Status:** Verificado (2026-10-20) — mesma causa raiz do BUG-001
- **Reportado por:** teste manual, 2026-10-19
- **Ambiente:** máquina local, `http://localhost:3000`, usuário `dev-ana` logado
- **Onde:** `src/components/layout/SiteHeader.tsx:31-42`; páginas `src/app/page.tsx:33` e `src/app/quiz/page.tsx:22`

**Passos para reproduzir**

1. Entrar com um usuário **sem linha em `profiles`**.
2. Observar o topo/direita da home e da página do quiz.

**Esperado:** header com "Olá, {apelido}" + botão **Sair**.
**Observado:** botão **Entrar** no topo/direita, tanto na home quanto durante o quiz.

**Causa raiz**

O `SiteHeader` trata o apelido como se fosse o estado de autenticação: renderiza "Entrar" sempre que `nickname` é falso (`SiteHeader.tsx:31-42`). O apelido vem de `getViewer()` (`src/lib/auth/viewer.ts:23-27`), que chama `rpc_my_profile()` — e essa função é `select ... from public.profiles where p.id = auth.uid()` (`supabase/migrations/20261019000200_functions.sql:515-517`), ou seja, **retorna NULL para quem não tem profile**.

Como `dev-ana` está sem profile (ver BUG-001), `nickname` é `null` → o header cai no ramo de visitante e mostra "Entrar", mesmo com sessão válida.

**Impacto:** além do botão errado, o header **deixa de oferecer o botão "Sair"** — o usuário logado sem profile não consegue encerrar a sessão pela interface (só limpando cookies). Isso atrapalha justamente o teste manual do fluxo de autenticação. Vale notar que a página do quiz **não** tem proteção de rota própria: quem entra ali depende do proxy, e a tela se apresenta como "deslogada".

**Correção proposta** (duas camadas)

1. **Dados:** backfill dos profiles (item 1 do BUG-001) — resolve o sintoma para `dev-ana`.
2. **Código (defensivo, independente):** o header não deve inferir sessão a partir do apelido. Passar um sinal explícito de autenticação, ex.:

   ```tsx
   // SiteHeader.tsx
   export function SiteHeader({ viewer, showLogin = true }: { viewer?: Viewer; showLogin?: boolean })
   // ramo: viewer ? (apelido + <LogoutButton />) : showLogin ? <Link href="/login">Entrar</Link> : null
   ```

   As páginas já têm o `viewer` em mãos (`page.tsx`, `quiz/page.tsx`, `ranking/page.tsx`, `resumo/page.tsx`), então a mudança é local e cabe no padrão atual. Exibir o apelido quando existir; sem apelido, ainda mostrar o **Sair** (a sessão é o que importa).

**Critério de aceite**

- Logado **com** profile: "Olá, {apelido}" + "Sair"; nunca "Entrar".
- Logado **sem** profile: "Sair" presente; nunca "Entrar".
- Deslogado: "Entrar" (exceto em `/login`, `/cadastro`, `/recuperar-senha` e `/redefinir-senha`, que já usam `showLogin={false}`).

**Correção aplicada (2026-10-20)**

- `SiteHeader` deixou de receber `nickname` e passou a receber `viewer`: a decisão agora é por **sessão**. Com sessão, o "Sair" aparece sempre; o "Olá, {apelido}" só quando existe apelido. Sem sessão, "Entrar" (respeitando `showLogin`).
- Páginas atualizadas para passar `viewer`: `src/app/page.tsx`, `src/app/quiz/page.tsx`, `src/app/resumo/page.tsx`, `src/app/ranking/page.tsx`. `not-found.tsx` e as páginas de auth seguem sem `viewer`.

**Verificado com sessão real** — usuário temporário `qa-header` (criado e removido no mesmo teste), HTML servido por `localhost:3000`:

| Estado | HTML do `<nav>` |
| --- | --- |
| Logado com profile | `Olá, qa-header` + `Sair` — sem `Entrar` |
| Logado **sem** profile (profile apagado de propósito) | `Sair` — sem `Entrar` e sem saudação |
| Deslogado (home) | sem `Sair`; com `Entrar` |

O estado do meio é exatamente o do defeito original: antes da correção, ele renderizava "Entrar". O usuário temporário foi removido e o banco voltou a 3 usuários e 3 profiles.

---

## BUG-006 — Gate D26 furado: seed de produção passava com `reviewed_by = "Automático"`

- **Severidade:** S1 · **Status:** Verificado (2026-10-20)
- **Arquivo:** `scripts/seed.ts:133-149` (lista de placeholders do gate de produção)

**Observado**

`supabase/seed/questions.json` traz `meta.reviewed_by = "Automático"`. A validação de seed de produção (`validateSeed`) só reprova quando o valor normalizado está na lista de placeholders:

```ts
const placeholders = new Set([
  "", "pendente", "pendente de revisão", "a revisar",
  "revisar", "todo", "tbd", "placeholder",
]);
if (seedEnv === "production" && placeholders.has(reviewed)) { throw ... }
```

`"Automático"` **não** estava na lista. Resultado: `npm run seed -- --dry-run --env=production` **passava**, e o gate D26 ("agente rascunha, humano revisa/aprova") podia ser satisfeito pelo próprio agente que redigiu as questões. O gate era apenas cosmético.

**Impacto:** a barreira que separa "rascunho do agente" de "aprovado por humano" não existia de fato. Um seed de produção com revisão automática passaria e o `prd.md` D26 seria violado sem deixar rastro.

**Correção aplicada (2026-10-20)** — `scripts/seed.ts`

A lista de placeholders passou a incluir os valores que significam "não revisado por humano": `automático`, `automatico`, `automatic`, `auto`, `agente`, `ia`, `llm`, `modelo` — além dos placeholders existentes. A comparação continua sobre o valor em minúsculas e sem espaços nas pontas.

**Verificado**

| Cenário | Antes | Depois |
| --- | --- | --- |
| `npm run seed -- --dry-run --env=production` (com `reviewed_by = "Automático"`) | passava | **falha** com `meta.reviewed_by precisa estar preenchido para seed de produção (revisão humana, D26)` — exit 1 |
| `npm run seed -- --dry-run --env=dev` | passava | passa (exit 0) — o gate só se aplica a produção |
| `npm run typecheck` / `lint` / `build` | — | passam (exit 0) |

**Nota:** corrigir o gate não substitui a revisão humana. `meta.reviewed_by` continua `"Automático"` em `supabase/seed/questions.json` e precisa ser preenchido com o nome do revisor real (P0.3 / D26) — ver `pod_v2.md` §2 e §9.

---

## Correções aplicadas

| ID | Data | O que mudou | Verificado por |
| --- | --- | --- | --- |
| BUG-001 | 2026-10-20 | `scripts/seed-dev-users.ts` repara profile ausente e falha alto se o trigger não rodar; backfill aplicado nos 2 usuários de dev | `rpc_public_ranking` com `dev-ana`/8; 2ª execução sem duplicar; typecheck, lint e build (EXIT=0) |
| BUG-004 | 2026-10-20 | Projeto dev com `mailer_autoconfirm = true` (confirmação desligada); o toggle "Enable email provider" desligado por engano foi revertido | `/auth/v1/settings` (`external.email=true`, `mailer_autoconfirm=true`); signup 200 já com sessão; login 200; senha de 7 caracteres recusada (422) |
| BUG-003 | 2026-10-20 | `LoginForm` mapeia `error.code` (`email_not_confirmed` ≠ `invalid_credentials`) | códigos obtidos via API real (400 sem sessão / senha errada) |
| BUG-005 | 2026-10-20 | `SiteHeader` decide por sessão (`viewer`), não por apelido | HTML real em 3 estados com sessão válida |
| BUG-006 | 2026-10-20 | Gate D26 reprova `reviewed_by` de origem automática; seed de produção agora **falha fechado** | dry-run de produção exit 1 com a mensagem do D26; dry-run de dev segue passando |

---

## Dados de dev a reparar / já esperados

- **Profiles faltantes:** ~~`dev-ana` e `dev-bruno` (sem profile desde 19:09)~~ — **reparado em 2026-10-20** por `seed:dev-users`; o ranking já mostra `dev-ana` com 8.
- **Sessão aberta:** `53650d93…` (`in_progress`, 1 respondida, 20:39) — será abandonada automaticamente (TTL *lazy*) no próximo `start`; não é defeito.
- **Conta não confirmada:** ~~apelido `roger`, criada 20:27:18~~ — **removida pelo usuário em 2026-10-20**. Com o BUG-004 corrigido, esse bloqueio deixou de existir; restam `dev-ana` e `dev-bruno`, ambas confirmadas. Estado conferido: `auth.users = 2`, `profiles = 2`, sem linhas órfãs.

## Comportamentos esperados (não são bugs)

- Ranking vazio quando não existe nenhuma sessão `completed`.
- Sessão abandonada / em andamento **não** pontua no ranking.
- Regras de sorteio, timer de 20 s no servidor e ciclo de questões já verificados no banco (`question_views` = 20 para 2 sessões).

## Verificações pendentes relacionadas

~~O `scripts/verify-security.sql` continua não executado.~~ **Executado em 2026-10-20** contra o projeto dev. Não havia `psql` local e `supabase db dump` exige Docker, então o script rodou **verbatim** pelo Management API do Supabase (`POST /v1/projects/tcpmvnxjegitfktdbcjo/database/query`), autenticado com o token que o CLI já mantinha no Credential Manager. O script é somente leitura (`select`, `has_*_privilege` e `raise`), sem DDL ou DML.

**Resultado: passou** — nenhuma exceção levantada, e os valores medidos confirmam cada invariante:

| Verificação | Medido |
| --- | --- |
| Tabelas `public` com RLS desabilitado | 0 (9/9 com RLS) |
| Policies em `public` | 0 (deny-all) |
| `anon` com `SELECT` em `question_options` / `quiz_sessions` | `false` / `false` |
| `authenticated` com `SELECT` em `session_options` | `false` |
| `anon` com `EXECUTE` em `rpc_start_session` | `false` |
| `anon` com `EXECUTE` em `rpc_public_ranking` / `rpc_check_nickname` | `true` / `true` |
| `authenticated` com `EXECUTE` em `rpc_submit_answer` | `true` |
| `authenticated` com `EXECUTE` em `select_session_questions` (interna) | `false` |
| Funções `security definer` **sem** `search_path` fixo | 0 (17/17 com `search_path = ""`) |
| Questões ativas / com forma inválida (9 opções, 1 correta) | 200 / 0 |

**Sondas HTTP como `anon`** (a perspectiva de quem tenta ler o gabarito): `question_options`, `questions`, `quiz_sessions`, `session_options`, `profiles` e `question_views`, além de `rpc_submit_answer`, `rpc_advance`, `rpc_get_summary`, `rpc_my_profile`, `rpc_start_session` e `seed_question` → **todas 401/42501**. `rpc_public_ranking` e `rpc_check_nickname` → 200, como previsto.

**Ressalvas honestas:** (a) a execução foi por API, não pelo SQL Editor, e as mensagens `NOTICE` não são devolvidas por esse endpoint — o "passou" é inferido da ausência de exceção, corroborada pela tabela acima; (b) o runner usado ficou em diretório temporário, **fora do repositório**, sem adicionar dependência ao projeto; (c) falta reexecutar em **produção** quando o projeto existir. O caminho reproduzível e recomendado continua sendo o SQL Editor do dashboard.
