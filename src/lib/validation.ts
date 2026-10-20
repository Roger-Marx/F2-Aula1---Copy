import { z } from "zod";

export const answerSchema = z.object({
  sessionQuestionId: z.string().uuid(),
  label: z.enum(["A", "B", "C", "D"]),
});

export const uuidSchema = z.string().uuid();
