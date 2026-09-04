"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { sendPasswordReset } from "@/lib/auth/service";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl bg-surface p-8 shadow-soft-lg ring-1 ring-border/60">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Recuperar senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>Se existir uma conta com esse e-mail, você receberá as instruções em instantes.</p>
            <Link href="/login" className="font-medium text-primary-700 hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary-500 transition focus:ring-2"
              />
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Enviar link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
