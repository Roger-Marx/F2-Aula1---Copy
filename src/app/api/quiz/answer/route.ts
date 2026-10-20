import type { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  isSameOrigin,
  rpcErrorResponse,
  rpcPayloadError,
} from "@/lib/api";
import type { FeedbackPayload } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { answerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("INVALID_ORIGIN", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_INPUT", 400);
  }

  const parsed = answerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("INVALID_INPUT", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("UNAUTHENTICATED", 401);
    }

    const { data, error } = await supabase.rpc("rpc_submit_answer", {
      p_session_question_id: parsed.data.sessionQuestionId,
      p_label: parsed.data.label,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    const payloadError = rpcPayloadError(data);

    if (payloadError) {
      return jsonError(payloadError);
    }

    return jsonOk(data as FeedbackPayload);
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
