"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackPanel } from "@/components/quiz/FeedbackPanel";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Timer } from "@/components/quiz/Timer";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import type {
  AdvanceResponse,
  FeedbackPayload,
  OptionLabel,
  QuestionPayload,
  StartResponse,
} from "@/lib/quiz/types";

type ApiResult<T> = ({ ok: true } & T) | { ok: false; code: string; message: string };

type Phase = "loading" | "question" | "feedback" | "error";

async function postJson<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as ApiResult<T> | null;

    if (!data || typeof data !== "object" || !("ok" in data)) {
      return {
        ok: false,
        code: "INTERNAL",
        message: "Resposta inválida do servidor. Tente novamente.",
      };
    }

    return data;
  } catch {
    return {
      ok: false,
      code: "NETWORK",
      message: "Não foi possível conectar. Verifique sua internet e tente novamente.",
    };
  }
}

export function QuizRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);
  const answerLockRef = useRef(false);
  const advanceLockRef = useRef(false);

  const handleFailure = useCallback(
    (failure: { code: string; message: string }) => {
      if (failure.code === "UNAUTHENTICATED") {
        router.replace("/login?next=/quiz");
        return;
      }

      setError(failure.message);
      setPhase("error");
    },
    [router],
  );

  const start = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setFeedback(null);
    setQuestion(null);

    const result = await postJson<StartResponse>("/api/quiz/start");

    if (!result.ok) {
      handleFailure(result);
      return;
    }

    setQuestion(result.question);
    setPhase("question");
  }, [handleFailure]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void start();
  }, [start]);

  const submit = useCallback(
    async (label: OptionLabel) => {
      if (!question || answerLockRef.current) {
        return;
      }

      answerLockRef.current = true;
      setBusy(true);
      setError(null);

      try {
        const result = await postJson<FeedbackPayload>("/api/quiz/answer", {
          sessionQuestionId: question.sessionQuestionId,
          label,
        });

        if (!result.ok) {
          handleFailure(result);
          return;
        }

        setFeedback(result);
        setPhase("feedback");
      } finally {
        answerLockRef.current = false;
        setBusy(false);
      }
    },
    [question, handleFailure],
  );

  const advance = useCallback(async () => {
    if (advanceLockRef.current) {
      return;
    }

    advanceLockRef.current = true;
    setBusy(true);
    setError(null);

    try {
      // No máximo 2 novas tentativas após QUESTION_OPEN (pod.md §7.3).
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await postJson<AdvanceResponse>("/api/quiz/advance");

        if (result.ok) {
          if (result.state === "question") {
            setQuestion(result.question);
            setFeedback(null);
            setPhase("question");
          } else if (result.state === "feedback") {
            setFeedback(result);
            setPhase("feedback");
          } else {
            router.push("/resumo");
            router.refresh();
          }

          return;
        }

        if (result.code === "QUESTION_OPEN" && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }

        handleFailure(result);
        return;
      }
    } finally {
      advanceLockRef.current = false;
      setBusy(false);
    }
  }, [handleFailure, router]);

  if (phase === "loading") {
    return (
      <GlassCard className="p-8" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          Preparando seu quiz
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Sorteando 10 questões em 5 níveis. Isso leva só um instante.
        </p>
        <div className="mt-6 grid gap-2" aria-hidden="true">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-indigo-200/70" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-indigo-200/50" />
          <div className="h-12 animate-pulse rounded-xl bg-white/60" />
          <div className="h-12 animate-pulse rounded-xl bg-white/60" />
        </div>
      </GlassCard>
    );
  }

  if (phase === "error") {
    return (
      <GlassCard className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Não foi possível continuar</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          O quiz foi interrompido. Você pode iniciar uma nova sessão.
        </p>
        {error ? (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => void start()}>Tentar novamente</Button>
          <Link href="/" className="btn btn-secondary">
            Voltar ao início
          </Link>
        </div>
      </GlassCard>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 sm:p-7">
        <Timer
          deadlineAt={question.deadlineAt}
          serverNow={question.serverNow}
          paused={phase === "feedback" || busy}
          onExpire={() => void advance()}
        />
        <QuestionCard
          question={question}
          feedback={feedback}
          disabled={busy}
          onSelect={(label) => void submit(label)}
        />
      </GlassCard>

      {feedback ? (
        <FeedbackPanel
          feedback={feedback}
          last={feedback.position === 10}
          onNext={() => void advance()}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
