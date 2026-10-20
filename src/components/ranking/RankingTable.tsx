import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import type { RankingEntry } from "@/lib/quiz/types";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function isCurrent(entry: RankingEntry, me: RankingEntry | null) {
  return Boolean(me && entry.position === me.position);
}

export function RankingTable({
  top,
  me,
}: {
  top: RankingEntry[];
  me: RankingEntry | null;
}) {
  if (top.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <h2 className="text-xl font-semibold">Ainda não há resultados</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
          Complete um quiz para ser o primeiro a aparecer no ranking.
        </p>
        <Link href="/quiz" className="btn btn-primary mt-5">
          Jogar agora
        </Link>
      </GlassCard>
    );
  }

  const meOutsideTop = me && !top.some((entry) => entry.position === me.position);

  return (
    <div className="space-y-4">
      <GlassCard className="hidden overflow-hidden sm:block">
        <table className="w-full text-left text-sm" aria-label="Ranking dos jogadores">
          <thead className="bg-white/45 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Posição
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Apelido
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Acertos
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Quando
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {top.map((entry) => (
              <tr
                key={`${entry.position}-${entry.nickname}`}
                className={
                  isCurrent(entry, me)
                    ? "bg-indigo-100/60"
                    : "bg-transparent"
                }
              >
                <td className="px-5 py-3 font-mono text-sm tabular-nums">
                  {entry.position}º
                </td>
                <td className="px-5 py-3 font-medium">
                  {entry.nickname}
                  {isCurrent(entry, me) ? (
                    <span className="ml-2 text-xs font-semibold text-[var(--color-primary)]">
                      você
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {entry.score}/10
                </td>
                <td className="px-5 py-3 text-right text-xs text-[var(--color-muted)]">
                  {formatDate(entry.achievedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      <ul className="grid gap-2 sm:hidden" aria-label="Ranking dos jogadores">
        {top.map((entry) => (
          <li key={`${entry.position}-${entry.nickname}`}>
            <GlassCard
              className={`flex items-center justify-between gap-3 p-4 ${
                isCurrent(entry, me) ? "border-indigo-300 bg-indigo-100/60" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="mr-2 font-mono text-sm text-[var(--color-muted)]">
                    {entry.position}º
                  </span>
                  {entry.nickname}
                  {isCurrent(entry, me) ? (
                    <span className="ml-2 text-xs font-semibold text-[var(--color-primary)]">
                      você
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {formatDate(entry.achievedAt)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums">
                {entry.score}/10
              </span>
            </GlassCard>
          </li>
        ))}
      </ul>

      {meOutsideTop ? (
        <GlassCard className="flex items-center justify-between gap-3 border-indigo-300 bg-indigo-100/60 p-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Sua posição
            </p>
            <p className="mt-1 font-medium">
              {me.position}º · {me.nickname}
            </p>
          </div>
          <span className="font-mono text-sm tabular-nums">{me.score}/10</span>
        </GlassCard>
      ) : null}
    </div>
  );
}
