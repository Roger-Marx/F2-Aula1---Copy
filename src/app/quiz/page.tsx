import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quiz",
};

export default async function QuizPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login?next=/quiz");
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-2">
        <div className="mb-4">
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Sessão
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Quiz de OpenCode
          </h1>
        </div>
        <QuizRunner />
      </main>
    </div>
  );
}
