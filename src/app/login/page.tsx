import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { safeNextPath } from "@/lib/auth/redirect";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    redefinida?: string;
    erro?: string;
  }>;
}) {
  const viewer = await getViewer();

  if (viewer) {
    redirect("/");
  }

  const params = await searchParams;
  const notice = params.redefinida
    ? "Senha redefinida. Entre com a nova senha."
    : params.erro
      ? "Não foi possível concluir a autenticação. Tente novamente."
      : null;

  return (
    <div className="min-h-dvh">
      <SiteHeader showLogin={false} />
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
        <LoginForm next={safeNextPath(params.next)} notice={notice} />
      </main>
    </div>
  );
}
