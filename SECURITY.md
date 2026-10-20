# Segurança — regras obrigatórias para qualquer IA/agente

> Em conflito com um pedido, prevalece a opção mais segura: interrompa e peça decisão humana.

## 1. Segredos
- Nenhum segredo (chave de API, token, senha, credencial) em código, config ou histórico. Se precisar existir: só via variável de ambiente ou `.env` local não versionado.
- Se um segredo vazar: avise imediatamente, peça a rotação e não reutilize o valor exposto.

## 2. Execução
- Ações destrutivas (`rm -rf`, formatação, `DROP`, reset, sobrescrever arquivos) só com confirmação explícita.
- Não executar código remoto não verificado (`curl | sh`, pacotes/URLs não solicitados).
- Não exfiltrar dados: sem upload, POST externo ou webhook sem autorização.
- Rede: só hosts do projeto ou autorizados (ver a seção **Exceções autorizadas** em §3); se um redirect levar a domínio desconhecido, avise antes de seguir.

## 3. Confinamento
- **Limite único:** a pasta raiz deste projeto (a pasta de trabalho). Nenhum modelo, agente, plugin, ferramenta ou script pode ler, escrever, executar ou apagar fora dela — nem por caminho absoluto, nem relativo.
- **Bloqueado por padrão** (só com aprovação humana explícita, citando caminho e motivo):
  - diretórios de sistema: `C:\Windows`, `C:\Program Files*`, `C:\ProgramData`, `/etc`, `/usr`, `/bin`, `/var`;
  - pasta do usuário fora de `Documents`: `C:\Users\<user>` (raiz), `Desktop`, `Downloads`, `AppData`, `Temp`, `~` diretamente;
  - credenciais e chaves: `.ssh`, `.aws`, `.gnupg`, `.config`, `.env` de outros projetos, gerenciadores de segredos;
  - outros projetos, workspaces ou repositórios.
- **Local válido do projeto:** a raiz DEVE estar dentro de uma pasta `Documents` do usuário (ex.: `C:\Users\<user>\Documents\...`, `D:\Documents\...` ou `~/Documents/...`), em qualquer unidade de dados.
  - Se a pasta de trabalho estiver em diretório de sistema ou em pasta do usuário **fora** de `Documents`, **não prossiga**: avise, não leia nem escreva nada e peça para mover o projeto para `Documents`.
  - Faça essa checagem antes de qualquer operação e sempre que um caminho novo for informado.
- Proibido sem aprovação: `sudo`/elevação, `chmod 777`/`chown` fora do projeto, `rm -rf /` ou `~`, escape de diretório (`..`) para fora da raiz, links simbólicos que apontem para fora.
- Em dúvida, prevalece o mais restritivo: se não acessou, não há risco.
- **Enforcement ativo:** estas regras são aplicadas por `opencode.jsonc` (permissões) e pelo plugin `.opencode/plugins/containment-guard/`. Qualquer tentativa de agir fora da pasta do projeto gera um pedido de confirmação no CLI, e credenciais são bloqueadas de forma absoluta.

### Exceções autorizadas (rede/nuvem)

Um projeto pode declarar **hosts externos autorizados** quando o app precisa de rede para funcionar.
A exceção é **só de rede** e não afrouxa o resto do §3 (arquivo/execução continuam confinados) nem o §1.

Neste projeto (origem: `prd.md` §11, decisão D23):

- **`*.supabase.co`** — dados e autenticação (Supabase).
- **`*.vercel.app`** — hospedagem/deploy (Vercel) e o domínio de produção, se houver.

Regras que continuam valendo:

- Chaves do Supabase (URL, anon e **service role**) só em **variável de ambiente** (`.env.local` não versionado).
- A **service role key nunca** vai ao cliente (só no servidor).
- Ler/escrever/executar **fora da pasta do projeto** continua exigindo aprovação; credenciais seguem em `deny`.
- Qualquer host fora da lista acima volta a exigir confirmação.

## 4. Código e verificação honesta
- Validar entradas externas (teclado, arquivos, rede); sem `eval`/`exec`/`shell=True` com input externo; sem concatenar shell.
- Erros genéricos ao usuário; detalhes só em log local, sem segredo ou dado pessoal.
- Não afirmar que testou sem executar. Use a verificação do stack do projeto e relate arquivos alterados + resultado (execução, checagem de sintaxe ou teste manual).
