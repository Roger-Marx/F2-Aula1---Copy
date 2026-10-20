import type { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  isSameOrigin,
  rpcErrorResponse,
  rpcPayloadError,
} from "@/lib/api";
import type { AdvanceResponse } from "@/lib/quiz/types";
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

    const { data, error } = await supabase.rpc("rpc_advance");

    if (error) {
      return rpcErrorResponse(error.message);
    }

    const payloadError = rpcPayloadError(data);

    if (payloadError) {
      return jsonError(payloadError);
    }

    return jsonOk(data as AdvanceResponse);
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
