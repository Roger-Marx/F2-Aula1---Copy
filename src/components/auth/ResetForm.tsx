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
import { useHydrated } from "@/lib/use-hydrated";

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(
          "Não foi possível redefinir a senha. O link pode ter expirado; solicite outro.",
        );
        return;
      }

      await supabase.auth.signOut();
      setDone(true);
      router.refresh();
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <GlassCard className="p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Senha alterada
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tudo certo</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Sua senha foi atualizada. Entre novamente com a nova senha.
        </p>
        <Link href="/login?redefinida=1" className="btn btn-primary mt-6 w-full">
          Entrar
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      <p className="text-sm font-medium text-[var(--color-primary)]">
        Redefinição
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Criar nova senha
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Escolha uma senha com pelo menos 8 caracteres.
      </p>

      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="reset-password"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Mínimo de 8 caracteres."
          required
        />
        <Button type="submit" className="w-full" disabled={loading || !hydrated}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </GlassCard>
  );
}
