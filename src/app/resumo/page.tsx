import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SummaryList } from "@/components/quiz/SummaryList";
import { GlassCard } from "@/components/ui/GlassCard";
import { getViewer } from "@/lib/auth/viewer";
import { hasSupabaseEnv } from "@/lib/env";
import type { SummaryPayload } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resumo",
};

type SummaryErrorCode =
  | "SESSION_OPEN"
  | "SESSION_NOT_FOUND"
  | "INTERNAL";

async function loadSummary(
  sessionId: string,
): Promise<{ summary: SummaryPayload | null; code: SummaryErrorCode | null }> {
  if (!hasSupabaseEnv) {
    return { summary: null, code: "INTERNAL" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_summary", {
    p_session_id: sessionId,
  });

  if (error || !data) {
    const message = error?.message ?? "";

    if (message.includes("SESSION_OPEN")) {
      return { summary: null, code: "SESSION_OPEN" };
    }

    if (message.includes("SESSION_NOT_FOUND")) {
      return { summary: null, code: "SESSION_NOT_FOUND" };
    }

    return { summary: null, code: "INTERNAL" };
  }

  return { summary: data as SummaryPayload, code: null };
}

export default async function SummaryPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login?next=/resumo");
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("oq_quiz_session")?.value;

  if (!sessionId || !uuidSchema.safeParse(sessionId).success) {
    redirect("/");
  }

  const { summary, code } = await loadSummary(sessionId);

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-2">
        {summary ? (
          <SummaryList summary={summary} />
        ) : (
          <GlassCard className="p-6 sm:p-8">
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Resumo
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {code === "INTERNAL"
                ? "Não foi possível carregar o resumo"
                : "Não encontramos um resumo disponível"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {code === "SESSION_OPEN"
                ? "Seu quiz ainda está em andamento. Como não há retomada, inicie uma nova sessão para concluir e ver o resumo."
                : code === "INTERNAL"
                  ? "Algo deu errado ao buscar esta sessão. Tente novamente em instantes."
                  : "A sessão pode ter expirado ou pertencer a outra conta. Inicie um novo quiz para gerar um resumo."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {code === "INTERNAL" ? (
                <a href="/resumo" className="btn btn-primary">
                  Tentar novamente
                </a>
              ) : (
                <Link href="/quiz" className="btn btn-primary">
                  Iniciar novo quiz
                </Link>
              )}
              <Link href="/ranking" className="btn btn-secondary">
                Ver ranking
              </Link>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
