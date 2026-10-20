import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { Viewer } from "@/lib/auth/viewer";

export function SiteHeader({
  viewer,
  showLogin = true,
}: {
  viewer?: Viewer;
  showLogin?: boolean;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-5">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-xl"
        aria-label="OpenCode Quiz — início"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-ink)] font-mono text-xs font-semibold text-white">
          OQ
        </span>
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          OpenCode Quiz
        </span>
      </Link>

      <nav aria-label="Principal" className="flex items-center gap-1.5">
        <Link href="/ranking" className="btn btn-ghost min-h-10 px-3">
          Ranking
        </Link>

        {viewer ? (
          <>
            {viewer.nickname ? (
              <span className="hidden max-w-40 truncate text-sm text-[var(--color-muted)] sm:inline">
                Olá, {viewer.nickname}
              </span>
            ) : null}
            <LogoutButton />
          </>
        ) : showLogin ? (
          <Link href="/login" className="btn btn-secondary min-h-10 px-3">
            Entrar
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
