import type { QuizOption } from "@/lib/quiz/types";

export type OptionState = "idle" | "correct" | "wrong" | "muted";

const stateClass: Record<OptionState, string> = {
  idle: "",
  correct: "option-correct",
  wrong: "option-wrong",
  muted: "option-muted",
};

export function OptionButton({
  option,
  state,
  disabled,
  onSelect,
}: {
  option: QuizOption;
  state: OptionState;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const selected = state === "correct" || state === "wrong";

  return (
    <button
      type="button"
      className={`option ${stateClass[state]}`}
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected ? true : undefined}
    >
      <span className="option-label" aria-hidden="true">
        {option.label}
      </span>
      <span className="pt-0.5">
        {option.body}
        {state === "correct" ? (
          <span className="sr-only"> (resposta correta)</span>
        ) : null}
        {state === "wrong" ? (
          <span className="sr-only"> (sua resposta, incorreta)</span>
        ) : null}
      </span>
    </button>
  );
}
