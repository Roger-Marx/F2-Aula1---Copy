import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { ClockIcon } from "@/components/ui/Icons";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

const subjects = [
  {
    title: "Fundamentos OpenCode e CLI",
    description:
      "Instalação, comandos, sessões, modelos, providers e conceitos essenciais.",
  },
  {
    title: "Features e Produtividade",
    description:
      "opencode.json, agentes, skills, ferramentas, permissões, MCP e plugins.",
  },
  {
    title: "Boas práticas de uso",
    description:
      "Planejamento, revisão, contexto, segurança e boas práticas no dia a dia.",
  },
];

export default async function HomePage() {
  const viewer = await getViewer();
  const quizHref = viewer ? "/quiz" : "/login?next=/quiz";

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Quiz de OpenCode
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Teste seu domínio do OpenCode em 10 questões.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
              Cinco níveis de dificuldade, 20 segundos por pergunta e uma
              explicação depois de cada resposta. O ranking guarda sua melhor
              pontuação.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link href={quizHref} className="btn btn-primary">
                {viewer ? "Começar quiz" : "Entrar e jogar"}
              </Link>
              <Link href="/ranking" className="btn btn-secondary">
                Ver ranking
              </Link>
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <ClockIcon className="h-4 w-4" />
              20 segundos por questão · feedback sem cronômetro
            </p>
          </div>

          <GlassCard className="p-6 sm:p-7">
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Como funciona
            </p>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 font-mono text-xs font-semibold text-[var(--color-primary)]">
                  1
                </span>
                <p className="text-sm leading-relaxed">
                  São 10 questões: duas de cada nível, da mais fácil à mais
                  difícil.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 font-mono text-xs font-semibold text-[var(--color-primary)]">
                  2
                </span>
                <p className="text-sm leading-relaxed">
                  Você tem 20 segundos para responder. O servidor controla o
                  tempo.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 font-mono text-xs font-semibold text-[var(--color-primary)]">
                  3
                </span>
                <p className="text-sm leading-relaxed">
                  A ordem das alternativas é sorteada e fica fixa até o fim da
                  sessão.
                </p>
              </li>
            </ol>
          </GlassCard>
        </section>

        <section className="mt-12" aria-labelledby="subjects-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                id="subjects-title"
                className="text-2xl font-semibold tracking-tight"
              >
                O que cai
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                O banco tem 200 perguntas, 40 por nível.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {subjects.map((subject) => (
              <GlassCard key={subject.title} className="p-5">
                <h3 className="font-semibold leading-snug">
                  {subject.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {subject.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-2 border-t border-[var(--color-line)] pt-5 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>OpenCode Quiz · conteúdo em pt-BR</p>
          <p>Feito para praticar antes de colocar a IA para trabalhar.</p>
        </footer>
      </main>
    </div>
  );
}
