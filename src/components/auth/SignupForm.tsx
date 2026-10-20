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

const NICKNAME_INVALID = /[\u0000-\u001f\u007f]/;

export function SignupForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

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

    const cleanNickname = nickname.trim();

    if (
      cleanNickname.length < 3 ||
      cleanNickname.length > 20 ||
      NICKNAME_INVALID.test(cleanNickname)
    ) {
      setError("Use um apelido de 3 a 20 caracteres.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const checkResponse = await fetch(
        `/api/nickname?value=${encodeURIComponent(cleanNickname)}`,
        { cache: "no-store" },
      );
      const checkData = (await checkResponse.json().catch(() => null)) as
        | { ok?: boolean; valid?: boolean; available?: boolean }
        | null;

      if (!checkResponse.ok || !checkData?.ok || !checkData.valid) {
        setError("Não foi possível validar o apelido. Tente novamente.");
        return;
      }

      if (!checkData.available) {
        setError("Este apelido já está em uso. Escolha outro.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { nickname: cleanNickname },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/quiz`,
        },
      });

      if (signUpError) {
        setError("Não foi possível criar a conta. Revise os dados e tente novamente.");
        return;
      }

      if (data.session) {
        router.replace("/quiz");
        router.refresh();
        return;
      }

      setConfirmation(true);
    } catch {
      setError("Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <GlassCard className="p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Confirme seu e-mail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Falta pouco
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Enviamos um link de confirmação para <strong>{email.trim()}</strong>.
          Abra o link para ativar sua conta e começar a jogar.
        </p>
        <Link href="/login" className="btn btn-primary mt-6 w-full">
          Ir para entrar
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      <p className="text-sm font-medium text-[var(--color-primary)]">
        OpenCode Quiz
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Escolha um apelido público, seu e-mail e uma senha.
      </p>

      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="signup-nickname"
          label="Apelido"
          autoComplete="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          hint="3 a 20 caracteres. Aparece no ranking e não pode ser alterado."
          maxLength={20}
          required
        />
        <TextField
          id="signup-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hint="Não aparece no ranking."
          required
        />
        <TextField
          id="signup-password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Mínimo de 8 caracteres."
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-[var(--color-muted)]">
        Já tem conta?{" "}
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
