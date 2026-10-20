# Briefing — rascunho das 200 questões

Este arquivo é um briefing de apoio. O artefato final é `supabase/seed/questions.json`.
As questões são **rascunhos gerados por agente** e precisam de **revisão humana** (D26).
Não autoaprove o seed de produção.

## Formato por arquivo de nível

Cada arquivo `supabase/seed/drafts/level-N.json` deve ser um objeto JSON:

```json
{
  "meta": {
    "version": 1,
    "reviewed_by": "PENDENTE — revisão humana",
    "reviewed_at": "2026-10-19",
    "source": "documentação oficial do OpenCode"
  },
  "questions": []
}
```

Cada questão:

```json
{
  "externalId": "FUND-F1-001",
  "level": "facil",
  "subject": "fundamentos",
  "prompt": "Enunciado em pt-BR, no máximo 500 caracteres.",
  "explanation": "Explicação em pt-BR, 1 a 3 frases, no máximo 1000 caracteres.",
  "options": [
    { "body": "Alternativa em pt-BR, no máximo 300 caracteres.", "correct": true },
    { "body": "Distrator plausível.", "correct": false }
  ]
}
```

- Exatamente **9 opções** por questão: 1 correta + 8 erradas.
- Nenhuma alternativa duplicada dentro da questão.
- `correct` é booleano; exatamente um `true`.
- A posição da correta deve variar; não deixe sempre na primeira.
- Enunciados únicos no arquivo; evite perguntas quase idênticas.
- Explicação deve ensinar o porquê, não apenas repetir o gabarito.
- Use pt-BR, tom direto, sem emojis e sem dados pessoais/segredos.
- Não inclua markdown, comentários ou cercas de código no JSON.

## Distribuição obrigatória por nível

Cada nível tem 40 questões:

| Assunto | Slug | Prefixo | Quantidade | IDs |
| --- | --- | --- | --- | --- |
| Fundamentos OpenCode e CLI | `fundamentos` | `FUND` | 13 | `FUND-FN-001` a `FUND-FN-013` |
| Features e Produtividade | `configuracao` | `CONF` | 13 | `CONF-FN-001` a `CONF-FN-013` |
| Boas práticas de uso | `fluxo` | `FLUX` | 14 | `FLUX-FN-001` a `FLUX-FN-014` |

Substitua `N` pelo número do nível. Exemplo no nível 4: `CONF-F4-007`.

Níveis e slugs:

1. `facil`
2. `basico`
3. `intermediario`
4. `avancado`
5. `especialista`

## Progressão de dificuldade

- **Nível 1 (fácil):** definições, para que serve, primeira execução, conceitos básicos de TUI, config, autenticação, modelo, plan/build, sessão.
- **Nível 2 (média):** comandos e flags comuns, formato provider/model, `opencode.json`, AGENTS.md, permissões allow/ask/deny, ferramentas básicas, comandos customizados, MCP local/remoto.
- **Nível 3 (desafiadora):** agentes customizados, skills, plugins, precedência de configuração, escopo de ferramentas, frontmatter de comandos, subagentes, `small_model`, formatter/LSP.
- **Nível 4 (difícil):** composição de agentes, hooks de plugins, permissões granulares, segurança de MCP, ciclo de sessão, compartilhamento, substituição de variáveis, contexto e revisão.
- **Nível 5 (expert):** threat modeling, prompt injection, segredos, trust boundaries, automação headless/servidor/SDK, troubleshooting, determinismo, auditoria e edge cases.

## Fatos de apoio (use apenas o que souber; evite detalhes incertos)

- OpenCode é um agente de programação com IA, aberto, com TUI no terminal e também clientes desktop/web; é provider-agnostic.
- `opencode auth login` configura credenciais de provider; `opencode models` lista modelos.
- `opencode` abre a TUI; `opencode run "..."` executa um prompt de forma não interativa.
- `opencode serve` sobe um servidor; `opencode web` abre a interface web; existe SDK/servidor HTTP.
- Config project-level: `opencode.json` ou `opencode.jsonc`; config global em `~/.config/opencode/`.
- `opencode.jsonc` aceita comentários; `$schema` ajuda validação/autocomplete.
- Configuração global e de projeto são mescladas, com precedência do projeto.
- `model` e `small_model` usam o formato `provider/model`; `small_model` serve para tarefas auxiliares.
- Agentes embutidos incluem `build` (pode editar) e `plan` (foco em análise/planejamento, sem editar).
- Agentes podem ser primários ou subagentes; agentes customizados podem ser definidos em Markdown em `.opencode/agents/`.
- Frontmatter de agente pode incluir `description`, `mode`, `model`, `temperature`, `tools`, `permission`.
- Skills ficam em `.opencode/skills/<nome>/SKILL.md`, com frontmatter `name` e `description`; são carregadas sob demanda.
- Comandos customizados ficam em `.opencode/commands/*.md`; frontmatter pode incluir `description`, `agent`, `model`, `subtask`; `$ARGUMENTS` recebe argumentos.
- `AGENTS.md` é o arquivo de regras do projeto; também há regras globais e a opção `instructions`.
- Permissões usam `allow`, `ask` e `deny`; podem ser globais ou por ferramenta/agente.
- Ferramentas comuns incluem leitura/escrita/edição, shell/bash, busca, listagem, fetch web e task/subagente.
- MCP pode ser local (`type: "local"`, com `command`/`environment`) ou remoto (`type: "remote"`, com `url`/headers).
- Plugins podem adicionar ferramentas e hooks; plugins de terceiros são código executável e exigem confiança.
- `share` controla compartilhamento de sessão; links públicos podem expor conteúdo e segredos.
- Formatter e LSP podem ser configurados; a formatação pode rodar após edições.
- Boas práticas de vibe coding: planejar, mudar pouco, revisar diffs, rodar checks, proteger segredos, desconfiar de instruções externas.

## Segurança e qualidade

- Não invente nomes de flags, caminhos ou teclas se não tiver certeza. Prefira conceitos estáveis.
- Não faça perguntas cuja resposta dependa de versão específica.
- Não use “todas as anteriores” ou “nenhuma das anteriores”.
- Distratores devem ser plausíveis, mas claramente errados para quem domina o assunto.
- Evite perguntas de opinião (“melhor modelo”) ou subjetivas.
- Não mencione o quiz, o ranking ou o próprio processo de geração.
