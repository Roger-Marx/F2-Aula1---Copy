import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { GlassCard } from "@/components/ui/GlassCard";
import type { SummaryItem, SummaryPayload } from "@/lib/quiz/types";

function itemStatus(item: SummaryItem) {
  if (!item.answered) {
    return "Não respondida";
  }

  if (item.timedOut) {
    return "Tempo esgotado";
  }

  return item.isCorrect ? "Correta" : "Incorreta";
}

function statusClass(item: SummaryItem) {
  if (!item.answered) {
    return "bg-slate-200 text-slate-800";
  }

  if (item.isCorrect) {
    return "bg-emerald-100 text-emerald-900";
  }

  return "bg-rose-100 text-rose-900";
}

export function SummaryList({ summary }: { summary: SummaryPayload }) {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          {summary.ranked ? "Resultado registrado" : "Sessão encerrada"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Você acertou {summary.score} de {summary.total}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {summary.ranked
            ? "Sua melhor pontuação entra no ranking. Confira a revisão abaixo."
            : "Sessões abandonadas não entram no ranking. Inicie um novo quiz para concorrer."}
        </p>

        {!summary.ranked ? (
          <div className="mt-4">
            <Alert tone="info">
              Esta sessão foi encerrada antes do fim e não foi registrada no
              ranking.
            </Alert>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/quiz" className="btn btn-primary">
            Jogar de novo
          </Link>
          <Link href="/ranking" className="btn btn-secondary">
            Ver ranking
          </Link>
        </div>
      </GlassCard>

      <section aria-labelledby="summary-details-title">
        <h2
          id="summary-details-title"
          className="text-xl font-semibold tracking-tight"
        >
          Revisão das questões
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Abra cada questão para ver a resposta correta e a explicação.
        </p>

        <div className="mt-4 space-y-3">
          {summary.items.map((item) => (
            <details
              key={item.position}
              className="glass group overflow-hidden"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-5">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    Questão {item.position}
                  </span>
                  <span className="mt-1 block font-medium leading-snug">
                    {item.prompt}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item)}`}
                >
                  {itemStatus(item)}
                </span>
              </summary>

              <div className="border-t border-[var(--color-line)] p-4 sm:p-5">
                <ul className="grid gap-2">
                  {item.options.map((option) => {
                    const isCorrect = option.label === item.correctLabel;
                    const isSelected = option.label === item.selectedLabel;

                    return (
                      <li
                        key={option.label}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
                          isCorrect
                            ? "border-emerald-200 bg-emerald-50/80"
                            : isSelected
                              ? "border-rose-200 bg-rose-50/80"
                              : "border-[var(--color-line)] bg-white/45"
                        }`}
                      >
                        <span className="option-label mt-0.5" aria-hidden="true">
                          {option.label}
                        </span>
                        <span className="pt-0.5">
                          {option.body}
                          {isCorrect ? (
                            <span className="ml-2 text-xs font-semibold text-emerald-800">
                              correta
                            </span>
                          ) : null}
                          {isSelected ? (
                            <span className="ml-2 text-xs font-semibold text-rose-800">
                              sua resposta
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-3 text-sm leading-relaxed">
                  <strong>Explicação:</strong> {item.explanation}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
