"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/TextField";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Mensagens por código do Supabase Auth. O fallback é genérico de propósito:
// "E-mail ou senha inválidos." só vale para credenciais realmente inválidas.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  invalid_credentials: "E-mail ou senha inválidos.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um minuto.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde um minuto.",
};

function loginErrorMessage(code: string | undefined) {
  return (
    (code ? LOGIN_ERROR_MESSAGES[code] : undefined) ??
    "Não foi possível entrar. Tente novamente."
  );
}

export function LoginForm({
  next,
  notice,
}: {
  next: string;
  notice?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(loginErrorMessage(signInError.code));
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      <p className="text-sm font-medium text-[var(--color-primary)]">
        OpenCode Quiz
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Use seu e-mail e senha para continuar.
      </p>

      <div className="mt-5 space-y-3">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          id="login-password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/recuperar-senha"
          className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
        <Link
          href="/cadastro"
          className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </div>
    </GlassCard>
  );
}
