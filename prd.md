# prd.md — Quiz Interativo (fonte da verdade)

> **Status:** v1.2 — **Planejamento concluído** (2026-10-17). Plano de desenvolvimento em `pod.md`. Fase atual: **Desenvolvimento** (código ainda não iniciado).
> **Regra:** só se implementa o que estiver acordado aqui. Em conflito, prevalece o `SECURITY.md`.
> **Proibido:** implementar algo fora do que está acordado aqui e em `pod.md`.
> **Histórico:** v0.3 (exploração inicial) → v1.0 (2026-10-16, exploração fechada) → v1.1 (2026-10-17 — correções de precisão do review; decisões D53–D58) → **v1.2** (2026-10-17 — planejamento fechado; itens em aberto e conflitos resolvidos; decisões D59–D65).

## 1. Visão geral

App **web full-stack** de **quiz interativo**, interface **moderna (glassmorphism), azul + lilás**, responsiva.

- Tema: **OpenCode e vibe coding**, dividido em **3 assuntos**: Fundamentos OpenCode e CLI, Features e Produtividade, Boas práticas de uso.
- Cada **sessão** tem **10 perguntas** sorteadas de um banco em **Supabase (Postgres)**.
- **Timer de 20s por pergunta** (decrescente).
- **Usuários se cadastram/entram**; resultado registrado no **histórico** e alimenta o **ranking** (regras em §4).
- Ao final: **tela de resumo** com a pontuação e a **explicação da resposta correta** de cada questão.
- **Stack:** Next.js + TypeScript + Tailwind (frontend + backend) e **Supabase** (dados/auth).
- **Deploy:** Vercel (app) + Supabase (dados).

## 2. Fases do projeto

1. **Exploração / Brainstorm** ✅ *concluída em 2026-10-16*
2. **Planejamento** ✅ *concluída em 2026-10-17* — desenho técnico em `pod.md`
3. **Desenvolvimento** ← *próxima* (inclui criar a base de **200 questões**, 40/nível)
4. **Review** (gate do PS Code Reviewer + `SECURITY.md`)
5. **Deploy** (Vercel + Supabase)

## 3. Requisitos funcionais (firmes)

| ID | Requisito |
| --- | --- |
| RF1 | App web **full-stack** (Next.js + TypeScript + Tailwind). |
| RF2 | **Cadastro e login** de usuário (auth via Supabase). |
| RF3 | Perguntas, gabarito e **explicação** mantidos em **base de dados** (Supabase/Postgres). |
| RF4 | Base com **200 questões** — **40 por nível** (~13/13/14 por assunto, D36), criadas na fase de Desenvolvimento. |
| RF5 | Cada questão no banco tem **1 resposta correta + 8 respostas erradas** + explicação. |
| RF6 | Sessão = **10 perguntas**: **2 por nível** (5 níveis), em **ordem crescente de dificuldade**. |
| RF7 | Na execução, exibir **1 correta + 3 erradas** (sorteadas das 8), **em ordem aleatória**, rótulos **A–D** atribuídos conforme a ordem exibida (A3). |
| RF8 | **+1 ponto por acerto**; placar começa em **0** (máx. 10). |
| RF9 | Resultado associado ao usuário e enviado ao **ranking** (regras em §4). |
| RF10 | Interface **moderna/glass**, **azul + lilás**, responsiva. |
| RF11 | **Timer de 20s por pergunta**, decrescente, visível. |
| RF12 | **Tela de resumo** ao final: pontuação + **explicação da resposta correta** de cada questão. |
| RF13 | Questões classificadas em **3 assuntos** (Fundamentos OpenCode e CLI / Features e Produtividade / Boas práticas de uso). |
| RF14 | **Sorteio persistido por sessão**: perguntas, as 3 erradas de cada questão e a ordem A–D definidos no servidor no **início** da sessão e imutáveis até o fim (D57). |
| RF15 | **Timer adjudicado no servidor**: resposta recebida após os 20s é erro, independentemente do cliente (D58). |
| RF16 | **Sem retomada de sessão** (revoga D39): sessão abandonada **auto-conclui** — acertos até o momento; **não respondidas = erro** (D53). |

## 4. Regras do quiz e do ranking

**Montar a sessão (a cada execução):** sortear 2 questões de cada nível → 10 no total; apresentar na
ordem **fácil → média → desafiadora → difícil → expert**.

**Montar as alternativas (por questão, por execução):** pegar a correta + 3 erradas sorteadas das 8;
embaralhar a ordem; atribuir os rótulos **A, B, C, D** na ordem em que aparecerem.

**Timer:** 20 segundos por pergunta. Ao esgotar: **conta como erro** (não soma ponto) e **avança** para a próxima.
A validade do tempo é **adjudicada no servidor** (RF15): resposta recebida após os 20s é erro, independentemente do cliente.

**Pontuação:** 0 no início; acerto soma 1. Resultado final = total de acertos (0–10).

**Estabilidade do sorteio (D57/RF14):** perguntas, erradas sorteadas e ordem A–D são definidos pelo
servidor **no início da sessão** e não mudam mais — nem em refresh, nem no resumo.

**Sessão abandonada (D53/RF16):** não há retomada. A sessão abandonada é **auto-concluída** pelo servidor:
pontuação = acertos até o momento; **perguntas não respondidas contam como erro**.

**Evitar repetição (D31/D60):** a sessão evita questões já vistas pelo usuário. O registro é **por usuário e por
nível**; ao **esgotar** um nível (40 vistas), o registro **daquele nível é limpo** e recomeça um novo ciclo.

**Ranking:**
- O resultado entra no ranking se for a **primeira conclusão** do usuário **ou** se **superar a melhor marca**.
- Cada usuário aparece **uma única vez**, com sua **melhor marca**.
- Desempate: **quem atingiu a marca primeiro** (D32); persistindo o empate (mesma pontuação e mesmo instante), **ordem alfabética do apelido** (D54).
- Sessão **abandonada não alimenta o ranking**; só sessões concluídas entram (D56).
- Exibição: **Top 10 + a posição do usuário** destacada (D41).

## 5. Stack e infraestrutura

| Camada | Escolha |
| --- | --- |
| Frontend | **Next.js (React) + TypeScript + Tailwind CSS** |
| Backend | **Next.js Route Handlers / Server Actions** (TypeScript) |
| Dados/Auth | **Supabase free tier** (Postgres + Auth) |
| Deploy | **Vercel** (app) + **Supabase** (dados) |

## 6. Decisões tomadas

> **Log append-only:** decisões não são editadas — a substituição é registrada na própria linha
> (ver D15 e D39). Só o texto que reapresenta a regra vigente pode receber referência cruzada "→ RFx".

| # | Decisão | Fase | Data |
| --- | --- | --- | --- |
| D1 | Produto é um app **web full-stack** de quiz. | Exploração | 2026-10-16 |
| D2 | Tema: **OpenCode e vibe coding**. | Exploração | 2026-10-16 |
| D3 | Sessão = 10 perguntas; 4 alternativas (A–D). | Exploração | 2026-10-16 |
| D4 | **Feedback imediato** + placar final. | Exploração | 2026-10-16 |
| D5 | Arquitetura **backend + frontend**, pastas/arquivos conforme necessário. | Exploração | 2026-10-16 |
| D6 | **Cadastro de usuário**; pontuações salvas e **ranqueadas**. | Exploração | 2026-10-16 |
| D7 | Convenções do `AGENTS.md` **atualizadas**. | Exploração | 2026-10-16 |
| D8 | Perguntas + **gabarito em base de dados**. | Exploração | 2026-10-16 |
| D9 | Cada questão: **1 correta + 8 erradas** no banco. | Exploração | 2026-10-16 |
| D10 | Sessão: **2 questões por nível**, ordem **crescente** de dificuldade. | Exploração | 2026-10-16 |
| D11 | Alternativas por execução: 1 correta + 3 erradas, **ordem aleatória**, rótulos **A–D**. | Exploração | 2026-10-16 |
| D12 | **+1 ponto por acerto**; placar inicia em **0**, máximo **10** (→ RF8). | Exploração | 2026-10-16 |
| D13 | Ranking por **melhor marca**; **1 linha por usuário**. | Exploração | 2026-10-16 |
| D14 | **5 níveis**: fácil, média, desafiadora, difícil, expert. | Exploração | 2026-10-16 |
| D15 | ~~Base ≥ 200 questões~~ → **exatamente 200** (corrige por D59): 40/nível, criada no Desenvolvimento. | Exploração | 2026-10-16 |
| D16 | Visual **glass**, **azul + lilás**. | Exploração | 2026-10-16 |
| D17 | Stack: **Next.js + TypeScript + Tailwind**. | Exploração | 2026-10-16 |
| D18 | **Timer de 20s** por pergunta, decrescente. | Exploração | 2026-10-16 |
| D19 | Dados/Auth em **Supabase free tier**. | Exploração | 2026-10-16 |
| D20 | **3 assuntos**: Fundamentos OpenCode e CLI, Features e Produtividade, Boas práticas de uso. | Exploração | 2026-10-16 |
| D21 | **Tela de resumo** final com pontuação + **explicação da correta**. | Exploração | 2026-10-16 |
| D22 | Deploy: **Vercel + Supabase**. | Exploração | 2026-10-16 |
| D23 | **Exceção autorizada** de confinamento/rede: hosts `*.supabase.co` e `*.vercel.app` (+ domínio do projeto). | Exploração | 2026-10-16 |
| D24 | **Login obrigatório** para jogar; toda sessão concluída é registrada no **histórico**; o ranking usa a **melhor marca** (§4). | Exploração | 2026-10-16 |
| D25 | Auth **e-mail + senha** (Supabase Auth, com confirmação de e-mail e recuperação de senha; **sem OAuth/magic link**); iniciar com **usuários fictícios de teste**. | Exploração | 2026-10-16 |
| D26 | Base de 200 questões: **agente rascunha** (com base nos docs oficiais do OpenCode), **humano revisa/aprova**. | Exploração | 2026-10-16 |
| D27 | Sessão **equilibra os 3 assuntos** (~3–4 de cada) além de 2 por nível. | Exploração | 2026-10-16 |
| D28 | Após responder: mostra correta + explicação, **pausa o timer** e espera o botão **"Próxima"** — nesse intervalo **não há corrida de tempo** (D58). | Exploração | 2026-10-16 |
| D29 | Interpretações **A1–A8 confirmadas** (§7). | Exploração | 2026-10-16 |
| D30 | Histórico guarda **todas as sessões** (o ranking usa a melhor marca). | Exploração | 2026-10-16 |
| D31 | **Evitar repetir** perguntas já vistas pelo usuário (regra de esgotamento definida em D60). | Exploração | 2026-10-16 |
| D32 | Desempate do ranking: **quem atingiu a marca primeiro** (empate residual: **alfabético do apelido**, D54). | Exploração | 2026-10-16 |
| D33 | **Sem painel admin**; questões gerenciadas via **seed/migração** do Supabase. | Exploração | 2026-10-16 |
| D34 | Ranking **público** (visualizar sem login); **jogar exige login** (D24). | Exploração | 2026-10-16 |
| D35 | Nome do app: **OpenCode Quiz**. | Exploração | 2026-10-16 |
| D36 | Banco equilibrado por nível: **~13/13/14 por assunto** (fecha 40). | Exploração | 2026-10-16 |
| D37 | Perguntas do mesmo nível em **ordem aleatória** (supera a leitura "crescente dentro do nível" de A1/v0.x). | Exploração | 2026-10-16 |
| D38 | Ao **esgotar** um nível, **libera repetição** daquele nível (sessão sempre com 10). | Exploração | 2026-10-16 |
| D39 | ~~Sessão retomável~~ → **revogada por D53 (2026-10-17)**. Sessão: sem voltar e **sem retomada**. | Exploração | 2026-10-16 |
| D40 | **Resumo** com detalhe por questão + ações "jogar de novo"/"ver ranking". | Exploração | 2026-10-16 |
| D41 | Ranking exibe **Top 10 + posição do usuário** destacada. | Exploração | 2026-10-16 |
| D42 | Ranking em **página própria `/ranking`**. | Exploração | 2026-10-16 |
| D43 | Acessibilidade **básica** (teclado, foco visível, contraste, aria básico). | Exploração | 2026-10-16 |
| D44 | Senha com **mínimo 8 caracteres** (padrão Supabase Auth). | Exploração | 2026-10-16 |
| D45 | **Confirmação de e-mail desabilitada no dev** (revisar antes do deploy). | Exploração | 2026-10-16 |
| D46 | Nome no ranking = **apelido/username**; **e-mail nunca exposto**. | Exploração | 2026-10-16 |
| D47 | **Exclusão de conta fora de escopo** nesta versão. | Exploração | 2026-10-16 |
| D48 | Estrutura: **App Router com `src/`** (`src/app`, `src/components`, `src/lib`, `supabase/`). | Exploração | 2026-10-16 |
| D49 | Fallback do Supabase: **tela de erro amigável + "tentar de novo"**. | Exploração | 2026-10-16 |
| D50 | Deploy no **subdomínio `*.vercel.app`**. | Exploração | 2026-10-16 |
| D51 | Verificação por fase: **tsc + ESLint + teste manual**. | Exploração | 2026-10-16 |
| D52 | Esquema versionado em **`supabase/migrations`**. | Exploração | 2026-10-16 |
| D53 | **Sem retomada de sessão** (revoga D39): abandonada é **auto-concluída** — acertos até o momento; **não respondidas = erro** (→ RF16). Iniciar nova sessão abandona a anterior. | Review | 2026-10-17 |
| D54 | Desempate final do ranking (mesma pontuação **e** mesmo instante após D32): **ordem alfabética do apelido** (case-insensitive). | Review | 2026-10-17 |
| D55 | Requisitos não-funcionais **mensuráveis** (§10): montar sessão < 300 ms p95, ranking em 1 round-trip, Lighthouse a11y ≥ 90, `prefers-reduced-motion`. | Review | 2026-10-17 |
| D56 | **Verificação pós-restart** (estende D51): tsc + ESLint + plano de teste curto — sessões não editáveis pelo cliente, planos/RLS ativos, **gabarito não legível por anônimos** (§11), seed de produção sem usuários de teste. | Review | 2026-10-17 |
| D57 | **Sorteio persistido por sessão** (→ RF14): questões, 3 erradas de 8 e ordem A–D fixados no início, imutáveis. | Review | 2026-10-17 |
| D58 | **Timer adjudicado no servidor** (→ RF15); o intervalo de correção/explicação **não é cronometrado** (D28). | Review | 2026-10-17 |
| D59 | Base de questões = **exatamente 200** (40/nível; confirma RF4; corrige o texto de D15). | Planejamento | 2026-10-17 |
| D60 | **"Evitar repetir"** (refina D31/D38): registro de vistas é **por usuário e por nível**; ao **esgotar** um nível (40 vistas), o registro **daquele nível é limpo** e recomeça um novo ciclo. | Planejamento | 2026-10-17 |
| D61 | **"Ranking em 1 round-trip" (D55)** = **1 requisição HTTP** do cliente; o servidor pode rodar mais de uma query. | Planejamento | 2026-10-17 |
| D62 | **"Montar sessão < 300 ms p95" (D55)** = **tempo percebido no cliente**, do clique até a primeira pergunta exibir. | Planejamento | 2026-10-17 |
| D63 | **Lighthouse a11y ≥ 90 (D55)** vale para **todas as telas principais** (home, quiz, resumo, ranking). | Planejamento | 2026-10-17 |
| D64 | **Produção só em `*.vercel.app`** — sem domínio próprio (confirma D50). | Planejamento | 2026-10-17 |
| D65 | **Planejamento fechado** — desenho técnico em `pod.md`; itens em aberto e conflitos resolvidos; nenhum item pendente. | Planejamento | 2026-10-17 |

## 7. ✅ Interpretações confirmadas (A1–A8: 2026-10-16 · A9–A10: 2026-10-17)

| # | Confirmado |
| --- | --- |
| A1 | **5 níveis**: fácil, média, desafiadora, difícil, expert |
| A2 | **8 respostas erradas** por questão no banco |
| A3 | Rótulos **A–D** seguem a ordem de exibição |
| A4 | **Timer esgotado** = erro (não pontua) + avança |
| A5 | **Exatamente 1** correta por questão |
| A6 | **Explicação obrigatória** em toda questão |
| A7 | Interface em **pt-BR** |
| A8 | **Correção no servidor**; gabarito não vai ao cliente antes da resposta |
| A9 | **Sorteio persistido por sessão** — definido no início no servidor, imutável (RF14/D57) |
| A10 | **Timer adjudicado no servidor** — resposta após 20s é erro, independente do cliente (RF15/D58) |
| A11 | **Sem retomada de sessão** — abandono auto-conclui; não respondidas = erro (RF16/D53) |
| A12 | **Só sessões concluídas** alimentam o ranking; desempate final = alfabético do apelido (D54/D56) |

## 8. Planejamento (concluído)

**Nenhum item em aberto.** As decisões **D1–D65** fecham a exploração e o planejamento.

O desenho técnico (modelo de dados + RLS, estrutura de pastas e telas, critérios de aceite finais e
plano de verificação) está em **`pod.md`**.

## 9. Fora de escopo

- **Exclusão de conta / autoatendimento de privacidade** (D47).
- **Painel admin** de questões — gestão via seed/migração do banco (D33).
- **Login social (OAuth) e magic link** — só e-mail + senha (D25).

## 10. Critérios de aceite (firmes — v1.2)

- Sessão sempre com 10 perguntas: 2 por nível, ordem crescente de dificuldade.
- Alternativas por execução: 1 correta + 3 erradas, ordem aleatória, rótulos A–D.
- Timer de 20s visível e decrescente; esgotar avança sem pontuar.
- **Validade do timer no servidor**: resposta após 20s é erro independentemente do cliente; o intervalo de correção/explicação não é cronometrado (D58/D28).
- Sessão **sem retomada** (RF16/D53): abandonada é auto-concluída — acertos até o momento; não respondidas = erro; recarregar inicia **nova** sessão.
- Placar 0–10; feedback imediato; tela de resumo com explicações.
- Usuário aparece 1× no ranking com a melhor marca.
- **Correção no backend** (o gabarito não vaza para o cliente antes da resposta).
- **Sorteio estável na sessão**: questões, 3 erradas de 8 e ordem A–D fixados no início da sessão e imutáveis (D57).
- **Sem repetição de vistas** (D31/D60): a sessão evita questões já vistas; ao esgotar um nível, o registro **daquele nível** é limpo.
- **Validação pós-restart** (D56): tsc + ESLint + plano de teste curto; sessões não editáveis pelo cliente, **planos/RLS ativos no Supabase**, **gabarito não legível pela API anônima** (§11), **seed de produção sem usuários de teste**; checklist de produção (D45): reativar confirmação de e-mail e usar chaves de produção.
- **Non-functionals** (D55; detalhes em D61–D63): montar sessão < 300 ms p95 (**tempo percebido no cliente**); ranking em **1 requisição HTTP**; Lighthouse a11y ≥ 90 **em todas as telas principais**; respeitar `prefers-reduced-motion`.

### Rubrica das questões (aprovação das 200 — revisão humana, D26)

Cada questão só entra no banco se: **1 correta inequívoca**; 8 distratores **plausíveis** (sem "todas
as anteriores", sem comprimento-delator); alinhada ao **nível** e a **um dos 3 assuntos**; **explicação
que ensina** (1–3 frases, pt-BR, coerente com a doc oficial do OpenCode); sem segredos/dados pessoais.

## 11. Segurança (herda do `SECURITY.md`) — atenção extra: login + nuvem

- **Nenhum segredo** em código/config. Chaves do Supabase (URL, anon, **service role**) só em
  **variável de ambiente** (`.env.local` não versionado). A **service role key nunca** vai ao cliente.
- **Row Level Security (RLS)** no Supabase: usuário só lê/escreve o que é dele.
- **Gabarito não legível pela API anônima (D56):** a anon key é pública — se expuser a flag de correta, qualquer um lê as respostas direto na API. O desenho **deve** garantir: opção com flag de correta fora do alcance anônimo (tabela/view separada sem policy pública), **ou** coluna protegida, **ou** RPC *security definer* que entrega só o texto das opções. Leitura anônima permitida só do **texto** das alternativas da sessão (RF14/D57).
- **LGPD:** dado pessoal tratado = **e-mail + apelido**; o e-mail nunca é exposto (D46). Terceiros que processam dados: **Supabase** (dados/auth) e **Vercel** (hospedagem).
- **Validar toda entrada** no backend (Server Actions/Route Handlers); erros genéricos ao usuário.
- **Sem concatenar SQL** — usar o client/query builder parametrizado do Supabase.
- **O gabarito não vai ao cliente antes da resposta** — correção no servidor.
- **Usuários fictícios de teste** (D25): são **seed de dev**. Senhas simples são aceitáveis só em ambiente de
  teste; **não** viram credencial padrão em produção, **não** se reutiliza senha real e o seed de produção
  não deve conter contas de teste ativas.
- Sem `eval`/`exec`/`shell` com entrada externa; sem dados pessoais reais nos exemplos.

### Exceção autorizada de rede/confinamento (D23)

O `SECURITY.md` §2/§3 confina tudo à pasta do projeto. Este app **depende** de rede para funcionar:

- Hosts autorizados: **`*.supabase.co`** (dados/auth) e **`*.vercel.app`** (produção — sem domínio próprio, D64).
- Dados de usuários **saem** da pasta do projeto para o Supabase por decisão do projeto — é uma exceção
  consciente, registrada aqui. Qualquer outro host continua exigindo confirmação.
