---
name: frontend-design
description: Project-specific UI guidance for OpenCode Quiz. Use when building or changing screens, components, or visual styles. Keeps the glass blue/lilac interface simple, accessible, and consistent with prd.md (v1.2, email/password auth).
---

# Frontend Design — OpenCode Quiz

Read `prd.md` first, then `pod.md` §9. This skill covers execution only; it never expands product scope.

## Direction

- The brief is fixed: glassmorphism, blue + lilac, modern, responsive, pt-BR.
- One memorable element per screen: the question card and its 20s timer. Auth screens stay quiet.
- Subject cue: the quiz is about OpenCode and the CLI. Use one subtle detail — a `>` before the question number or a thin terminal-style timer bar. Do not turn the page into a fake terminal.
- No new screens beyond the v1.2 route map: home, login, signup, password recovery/reset, quiz, summary, ranking.
- No illustrations, 3D, confetti, sound, or marketing copy beyond what the PRD requires.

## Tokens

Start from these CSS variables in `src/app/globals.css`; expose them as Tailwind theme tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--bg-from` | `#DCE7FF` | page gradient start |
| `--bg-to` | `#EFE3FF` | page gradient end |
| `--surface` | `rgba(255,255,255,.64)` | glass cards |
| `--surface-strong` | `rgba(255,255,255,.84)` | selected/focused |
| `--border` | `rgba(79,70,229,.16)` | hairlines |
| `--text` | `#1E1B4B` | body and headings |
| `--muted` | `#55527A` | secondary text |
| `--primary` | `#4F46E5` | buttons, links, focus |
| `--accent` | `#8B5CF6` | lilac highlight |
| `--success` | `#15803D` | correct answer |
| `--danger` | `#BE123C` | wrong answer and form errors |

- Backdrop: two soft, static radial blobs (blue and lilac). No animated gradient.
- Glass: `backdrop-blur` + translucent surface + 1px border. Use it for the main panel, not every element.
- Primary button: `--primary` background, white text. Never gradient text.
- Type: **Sora** for UI (`next/font/google`, weights 400/500/600/700); **JetBrains Mono** only for timer, score, and code. Use `tabular-nums`.
- Scale: 14/16/18/24/32/48; line length under 75 characters; sentence case.
- Spacing: 4/8/12/16/24/32/48; page max-width 1080px; quiz card 720px; auth cards 420px.

## Layout by screen

- **Home**: short headline, one-line explanation, three subject names. One primary action: “Começar quiz” (logged out → `/login?next=/quiz`; logged in → `/quiz`) plus “Ver ranking”. Logged-in header shows “Sair”.
- **Login**: single 420px glass card; e-mail + senha; primary “Entrar”; links “Criar conta” and “Esqueci minha senha”. No social login, no magic link.
- **Cadastro**: 420px card; e-mail, apelido, senha (mín. 8); primary “Criar conta”; link “Já tenho conta”. State that the apelido is public and unique. No password confirmation field. If e-mail confirmation is on, swap the form for a short “Confirme seu e-mail” state.
- **Recuperar senha**: 420px card; e-mail + “Enviar link”; generic confirmation message (“Se o e-mail existir, enviaremos um link”). Do not reveal whether the account exists.
- **Redefinir senha**: 420px card; nova senha + “Salvar nova senha”; same minimum of 8 characters.
- **Quiz**: progress “Questão X de 10”, timer bar, prompt, options in a 2×2 grid (1 column on mobile), feedback panel, “Próxima”.
- **Resumo**: score first, then one native `<details>` per question with your answer, correct answer, and explanation; actions “Jogar de novo” and “Ver ranking”.
- **Ranking**: simple table on desktop, stacked rows on mobile; highlight only the current user; show nickname only, never e-mail.

## Components and states

Keep the inventory small: `GlassCard`, `Button`, `TextField`, `OptionButton`, `Timer`, `Feedback`, `RankingTable`.

- Auth: real `<form>` with visible labels (not placeholders), `autocomplete`, inline error under the field, submit disabled while loading. Use generic messages; never confirm whether an e-mail exists.
- Every interactive element needs default, hover, focus-visible, disabled, and loading states.
- Options: real `<button>` elements; disable after answering; correct/wrong must use icon + text, not color alone.
- Timer: visible number and progress bar; `role="timer"`; no per-second `aria-live`.
- Feedback: `role="status"`; reserve its space to avoid layout shift.
- Loading: skeleton or text in the same panel size; no full-page spinner.
- Header: brand, “Ranking”, and “Entrar” or “Sair”; never show the e-mail.

## Accessibility and motion (non-negotiable)

- Contrast ≥ 4.5:1 for text; visible 2px focus ring with offset.
- Full keyboard flow; no drag-only interaction.
- Auth fields have `<label for>`, `autocomplete="email"`, `"current-password"` or `"new-password"`; errors use `role="alert"` and focus the first invalid field.
- `prefers-reduced-motion`: remove entrance animations and non-essential transitions.
- One 200ms fade/slide on page load at most; answer feedback may animate because it responds to the user.
- Lighthouse a11y ≥ 90 on home, auth screens, quiz, summary, and ranking (D63).

## Copy (pt-BR)

- Sentence case, active voice, direct. Buttons say what happens: “Começar quiz”, “Entrar”, “Criar conta”, “Enviar link”, “Salvar nova senha”, “Próxima”, “Ver ranking”, “Jogar de novo”, “Sair”.
- Errors say what happened and what to do; no “Ops!”, no apologies, no exclamation marks.
- Login error: “E-mail ou senha incorretos.” Signup error: “Não foi possível criar a conta. Confira os dados ou tente entrar.” Nickname availability can say “Este apelido já está em uso.”
- “Tempo esgotado” instead of “Você perdeu”. “Sua posição” for the ranking row.
- No emojis, no filler, no English UI text.

## Avoid

- New product scope: admin, history screen, OAuth/magic link, account deletion, profile editing, themes.
- Extra auth steps: social login, magic link, password confirmation, onboarding, or custom e-mail verification screens beyond the Supabase confirmation link.
- Nested glass cards, glass on every section, decorative gradients behind text.
- All-caps eyebrows, numbered markers (“01 / 02 / 03”), middle-dot metadata strings, arrow suffixes on every link.
- UI/animation libraries, custom cursor, parallax, confetti, sound.
- Exposing e-mail in the ranking, header, or summary.
- Hiding focus outlines, color-only states, fixed pixel heights that clip translated text.

## Before finishing

- [ ] Only the routes in `pod.md` §9; auth screens included; all copy in pt-BR.
- [ ] Blue/lilac glass is consistent; one accent, one memorable element.
- [ ] Works at 360px, 768px, and 1280px.
- [ ] Keyboard, focus, contrast, reduced motion, auth autocomplete, and error announcements verified.
- [ ] Timer and score use tabular numbers; no layout shift on answer.
- [ ] `npm run typecheck`, `npm run lint`, and `npm run build` pass; Lighthouse a11y ≥ 90.
