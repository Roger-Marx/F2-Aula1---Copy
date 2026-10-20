export type OptionLabel = "A" | "B" | "C" | "D";

export type QuizOption = {
  label: OptionLabel;
  body: string;
};

export type QuestionPayload = {
  sessionQuestionId: string;
  position: number;
  total: number;
  prompt: string;
  options: QuizOption[];
  deadlineAt: string;
  serverNow: string;
};

export type FeedbackPayload = {
  state: "feedback";
  position: number;
  isCorrect: boolean;
  timedOut: boolean;
  selectedLabel: OptionLabel | null;
  correctOption: QuizOption;
  explanation: string;
  score: number;
};

export type SummaryItem = {
  position: number;
  prompt: string;
  options: QuizOption[];
  selectedLabel: OptionLabel | null;
  correctLabel: OptionLabel;
  explanation: string;
  answered: boolean;
  isCorrect: boolean;
  timedOut: boolean;
};

export type SummaryPayload = {
  sessionId: string;
  status: "completed" | "abandoned";
  ranked: boolean;
  score: number;
  total: number;
  completedAt: string | null;
  items: SummaryItem[];
};

export type StartResponse = {
  sessionId: string;
  question: QuestionPayload;
};

export type AdvanceResponse =
  | { state: "question"; question: QuestionPayload }
  | FeedbackPayload
  | { state: "summary"; summary: SummaryPayload };

export type RankingEntry = {
  position: number;
  nickname: string;
  score: number;
  achievedAt: string;
};

export type RankingResponse = {
  top: RankingEntry[];
  me: RankingEntry | null;
};

export type NicknameCheck = {
  valid: boolean;
  available: boolean;
  normalized: string | null;
};
