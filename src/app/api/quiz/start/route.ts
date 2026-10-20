import type { NextRequest } from "next/server";
import { jsonError, jsonOk, isSameOrigin, rpcErrorResponse } from "@/lib/api";
import type { StartResponse } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("INVALID_ORIGIN", 403);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("UNAUTHENTICATED", 401);
    }

    const { data, error } = await supabase.rpc("rpc_start_session");

    if (error) {
      return rpcErrorResponse(error.message);
    }

    const payload = data as StartResponse;
    const response = jsonOk(payload);

    response.cookies.set({
      name: "oq_quiz_session",
      value: payload.sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    });

    return response;
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
