export const ERROR_MESSAGES = {
  UNAUTHENTICATED: "Sua sessão expirou. Entre novamente.",
  INVALID_ORIGIN: "Requisição inválida.",
  INVALID_INPUT: "Dados inválidos. Revise e tente novamente.",
  INVALID_NICKNAME: "Use um apelido de 3 a 20 caracteres, sem caracteres de controle.",
  NICKNAME_TAKEN: "Este apelido já está em uso. Escolha outro.",
  RATE_LIMITED: "Você iniciou muitos quizzes. Tente novamente em 1 hora.",
  SESSION_CLOSED: "Esta sessão foi encerrada. Inicie um novo quiz.",
  SESSION_OPEN: "O quiz ainda está em andamento.",
  SESSION_NOT_FOUND: "Sessão não encontrada.",
  QUESTION_OPEN: "A questão atual ainda está aberta.",
  ALREADY_ANSWERED: "Esta questão já foi respondida.",
  BANK_INCOMPLETE: "O banco de perguntas está incompleto. Avise o administrador.",
  INTERNAL: "Algo deu errado. Tente novamente.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function apiErrorMessage(code: string): string {
  return ERROR_MESSAGES[code as ErrorCode] ?? ERROR_MESSAGES.INTERNAL;
}

export function errorStatus(code: string): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "INVALID_ORIGIN":
      return 403;
    case "INVALID_INPUT":
    case "INVALID_NICKNAME":
      return 400;
    case "SESSION_NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "INTERNAL":
    case "BANK_INCOMPLETE":
      return 500;
    default:
      return 409;
  }
}
