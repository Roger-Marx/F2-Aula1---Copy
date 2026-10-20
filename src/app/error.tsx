"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-16"
    >
      <GlassCard className="p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Não foi possível carregar esta página. Tente novamente; se o problema
          continuar, volte ao início.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Tentar novamente</Button>
          <Link href="/" className="btn btn-secondary">
            Voltar ao início
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
