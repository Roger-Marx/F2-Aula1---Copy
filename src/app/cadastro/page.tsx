import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default async function SignupPage() {
  const viewer = await getViewer();

  if (viewer) {
    redirect("/");
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader showLogin={false} />
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
        <SignupForm />
      </main>
    </div>
  );
}
