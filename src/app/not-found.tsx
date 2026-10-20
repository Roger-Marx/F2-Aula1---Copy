import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GlassCard } from "@/components/ui/GlassCard";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-8">
        <GlassCard className="p-6 sm:p-8">
          <p className="text-sm font-medium text-[var(--color-primary)]">
            404
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Página não encontrada
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            O endereço que você tentou abrir não existe.
          </p>
          <Link href="/" className="btn btn-primary mt-6">
            Voltar ao início
          </Link>
        </GlassCard>
      </main>
    </div>
  );
}
