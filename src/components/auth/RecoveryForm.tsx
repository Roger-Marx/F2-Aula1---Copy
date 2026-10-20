"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/TextField";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    if (!hasSupabaseEnv) {
      setError("Supabase não configurado. Preencha o .env.local.");
      return;
    }

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      // Resposta genérica para não revelar se o e-mail existe.
      setSent(true);
    } catch {
      setError("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <GlassCard className="p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Recuperação
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Verifique seu e-mail
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Se houver uma conta com esse e-mail, enviaremos um link para
          redefinir a senha. O link expira em pouco tempo.
        </p>
        <Link href="/login" className="btn btn-secondary mt-6 w-full">
          Voltar para entrar
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      <p className="text-sm font-medium text-[var(--color-primary)]">
        Recuperação
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Esqueci minha senha
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Informe seu e-mail para receber um link de redefinição.
      </p>

      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="recovery-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading || !hydrated}>
          {loading ? "Enviando..." : "Enviar link"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-[var(--color-muted)]">
        Lembrou a senha?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </GlassCard>
  );
}
