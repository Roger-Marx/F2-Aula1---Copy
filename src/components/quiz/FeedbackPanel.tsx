import { Button } from "@/components/ui/Button";
import { CheckIcon, XIcon } from "@/components/ui/Icons";
import type { FeedbackPayload } from "@/lib/quiz/types";

export function FeedbackPanel({
  feedback,
  last,
  onNext,
  busy,
}: {
  feedback: FeedbackPayload;
  last: boolean;
  onNext: () => void;
  busy?: boolean;
}) {
  const correct = feedback.isCorrect;

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-2xl border p-5 sm:p-6 ${
        correct
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-rose-200 bg-rose-50/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            correct
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {correct ? <CheckIcon /> : <XIcon />}
        </span>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {feedback.timedOut
              ? "Tempo esgotado"
              : correct
                ? "Resposta correta"
                : "Resposta incorreta"}
          </h2>

          <p className="mt-1 text-sm">
            Resposta correta:{" "}
            <strong>
              {feedback.correctOption.label}) {feedback.correctOption.body}
            </strong>
          </p>

          {!correct && feedback.selectedLabel ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Sua resposta: {feedback.selectedLabel}
            </p>
          ) : null}

          <p className="mt-3 text-sm leading-relaxed">{feedback.explanation}</p>

          <p className="mt-3 font-mono text-sm font-semibold">
            Placar: {feedback.score}/10
          </p>
        </div>
      </div>

      <Button
        className="mt-5 w-full sm:w-auto"
        onClick={onNext}
        disabled={busy}
      >
        {last ? "Ver resumo" : "Próxima questão"}
      </Button>
    </section>
  );
}
