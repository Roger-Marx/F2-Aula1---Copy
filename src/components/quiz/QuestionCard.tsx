import type {
  FeedbackPayload,
  OptionLabel,
  QuestionPayload,
} from "@/lib/quiz/types";
import { OptionButton, type OptionState } from "./OptionButton";

export function QuestionCard({
  question,
  feedback,
  disabled,
  onSelect,
}: {
  question: QuestionPayload;
  feedback: FeedbackPayload | null;
  disabled?: boolean;
  onSelect: (label: OptionLabel) => void;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">
          Questão {question.position} de {question.total}
        </span>
        <span className="font-mono text-xs">20 segundos</span>
      </div>

      <h2
        id="question-prompt"
        className="mt-3 text-balance text-xl font-semibold leading-snug sm:text-2xl"
      >
        {question.prompt}
      </h2>

      <div
        role="group"
        aria-labelledby="question-prompt"
        className="mt-5 grid gap-2.5 sm:grid-cols-2"
      >
        {question.options.map((option) => {
          let state: OptionState = "idle";

          if (feedback) {
            if (option.label === feedback.correctOption.label) {
              state = "correct";
            } else if (option.label === feedback.selectedLabel) {
              state = "wrong";
            } else {
              state = "muted";
            }
          }

          return (
            <OptionButton
              key={option.label}
              option={option}
              state={state}
              disabled={disabled || Boolean(feedback)}
              onSelect={() => onSelect(option.label)}
            />
          );
        })}
      </div>
    </div>
  );
}
