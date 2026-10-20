import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RankingTable } from "@/components/ranking/RankingTable";
import { Alert } from "@/components/ui/Alert";
import { getViewer } from "@/lib/auth/viewer";
import { hasSupabaseEnv } from "@/lib/env";
import type { RankingResponse } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking",
};

const EMPTY_RANKING: RankingResponse = { top: [], me: null };

async function loadRanking(): Promise<{
  ranking: RankingResponse;
  failed: boolean;
}> {
  if (!hasSupabaseEnv) {
    return { ranking: EMPTY_RANKING, failed: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_public_ranking");

  if (error || !data) {
    return { ranking: EMPTY_RANKING, failed: true };
  }

  return { ranking: data as RankingResponse, failed: false };
}

export default async function RankingPage() {
  const [viewer, rankingResult] = await Promise.all([getViewer(), loadRanking()]);
  const { ranking, failed } = rankingResult;

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />

      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Ranking
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Top 10
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          Vale a melhor pontuação de cada jogador. Empates são decididos por
          quem chegou primeiro; depois, pelo apelido.
        </p>

        <div className="mt-6">
          {failed ? (
            <div className="mb-4 space-y-2">
              <Alert tone="error">
                Não foi possível carregar o ranking agora. Tente novamente em
                instantes.
              </Alert>
              <a
                href="/ranking"
                className="inline-block text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                Tentar novamente
              </a>
            </div>
          ) : null}
          <RankingTable top={ranking.top} me={ranking.me} />
        </div>

        {!viewer ? (
          <p className="mt-5 text-sm text-[var(--color-muted)]">
            Entre para disputar o ranking.{" "}
            <a
              href="/login?next=/ranking"
              className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              Entrar
            </a>
          </p>
        ) : null}

        <p className="mt-6 text-xs text-[var(--color-muted)]">
          O ranking mostra apenas o apelido. Nenhum e-mail é exibido.
        </p>
      </main>
    </div>
  );
}
