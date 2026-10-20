import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const error = url.searchParams.get("error");

  if (code && !error) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        return NextResponse.redirect(new URL(next, request.url));
      }
    } catch {
      // Cai no redirecionamento genérico abaixo.
    }
  }

  return NextResponse.redirect(new URL("/login?erro=auth", request.url));
}
