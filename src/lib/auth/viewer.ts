import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  nickname: string | null;
} | null;

export async function getViewer(): Promise<Viewer> {
  if (!hasSupabaseEnv) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase.rpc("rpc_my_profile");
  const nickname =
    data && typeof data === "object" && "nickname" in data
      ? String(data.nickname)
      : null;

  return { id: user.id, nickname };
}
