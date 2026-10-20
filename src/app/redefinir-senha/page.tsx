import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/ResetForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function ResetPasswordPage() {
  const viewer = await getViewer();

  return (
    <div className="min-h-dvh">
      <SiteHeader showLogin={false} />
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
        {viewer ? (
          <ResetForm />
        ) : (
          <GlassCard className="p-6 sm:p-8">
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Redefinição
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Link inválido ou expirado
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Solicite um novo link de recuperação para criar uma nova senha.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href="/recuperar-senha" className="btn btn-primary">
                Solicitar novo link
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Voltar para entrar
              </Link>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
