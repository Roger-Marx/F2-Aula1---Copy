import type { NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { jsonError, jsonOk, rpcErrorResponse } from "@/lib/api";
import type { NicknameCheck } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return jsonError("INTERNAL", 500);
  }

  const value = request.nextUrl.searchParams.get("value") ?? "";

  if (value.length > 100) {
    return jsonError("INVALID_INPUT", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("rpc_check_nickname", {
      p_nickname: value,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonOk(data as NicknameCheck);
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
