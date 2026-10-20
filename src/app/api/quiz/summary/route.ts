import type { NextRequest } from "next/server";
import { jsonError, jsonOk, rpcErrorResponse } from "@/lib/api";
import type { SummaryPayload } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("oq_quiz_session")?.value;

  if (!sessionId || !uuidSchema.safeParse(sessionId).success) {
    return jsonError("SESSION_NOT_FOUND", 404);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("UNAUTHENTICATED", 401);
    }

    const { data, error } = await supabase.rpc("rpc_get_summary", {
      p_session_id: sessionId,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonOk(data as SummaryPayload);
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
