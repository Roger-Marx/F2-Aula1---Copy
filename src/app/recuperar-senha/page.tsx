import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecoveryForm } from "@/components/auth/RecoveryForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default async function RecoveryPage() {
  const viewer = await getViewer();

  if (viewer) {
    redirect("/");
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader showLogin={false} />
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
        <RecoveryForm />
      </main>
    </div>
  );
}
