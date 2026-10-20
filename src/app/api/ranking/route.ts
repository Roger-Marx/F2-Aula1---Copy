import { hasSupabaseEnv } from "@/lib/env";
import { jsonError, jsonOk, rpcErrorResponse } from "@/lib/api";
import type { RankingResponse } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMPTY_RANKING: RankingResponse = { top: [], me: null };

export async function GET() {
  if (!hasSupabaseEnv) {
    return jsonOk(EMPTY_RANKING);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("rpc_public_ranking");

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonOk((data ?? EMPTY_RANKING) as RankingResponse);
  } catch {
    return jsonError("INTERNAL", 500);
  }
}
