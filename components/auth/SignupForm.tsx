"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RoleToggle from "@/components/auth/RoleToggle";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  completeGoogleSignup,
  signUpWithEmail,
  signUpWithGoogle,
} from "@/lib/auth/service";
import { useAuth } from "@/lib/auth/AuthContext";
import type { SignupRole } from "@/lib/auth/types";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  attachReferralAfterSignup,
} from "@/lib/facilitators/client";
import {
  clearReferralCookie,
  readReferralCodeFromDocument,
} from "@/lib/facilitators/referral-cookie";

export default function SignupForm() {
  const router = useRouter();
  const { user, userDoc, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const completingGoogleProfile = !!user && !userDoc;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user && userDoc) {
      router.replace(
        userDoc.role === "tutor" ? "/tutor/onboarding" : "/bookings",
      );
    }
  }, [authLoading, router, user, userDoc]);

  useEffect(() => {
    if (user?.displayName && !displayName) {
      setDisplayName(user.displayName);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [displayName, email, user]);

  async function attachStoredReferralIfPresent(): Promise<void> {
    const referralCode = readReferralCodeFromDocument();
    if (!referralCode) {
      return;
    }

    await attachReferralAfterSignup({ referralCode });
    clearReferralCookie();
  }

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signUpWithEmail(email.trim(), password, displayName.trim(), role);
      trackEvent(ANALYTICS_EVENTS.signUp, { role, method: "email" });
      await attachStoredReferralIfPresent();
      router.replace(role === "tutor" ? "/tutor/onboarding" : "/bookings");
    } catch (signupError) {
      setError(getAuthErrorMessage(signupError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    setSubmitting(true);

    try {
      if (completingGoogleProfile) {
        await completeGoogleSignup(role);
      } else {
        await signUpWithGoogle(role);
      }
      trackEvent(ANALYTICS_EVENTS.signUp, { role, method: "google" });
      await attachStoredReferralIfPresent();
      router.replace(role === "tutor" ? "/tutor/onboarding" : "/bookings");
    } catch (signupError) {
      setError(getAuthErrorMessage(signupError));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl bg-surface p-8 shadow-soft-lg ring-1 ring-border/60">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {completingGoogleProfile ? "Complete seu cadastro" : "Crie sua conta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {completingGoogleProfile
              ? "Escolha como deseja usar a Aprendiz Bay."
              : "Junte-se à comunidade de aprendizado coletivo."}
          </p>
        </div>

        <div className="space-y-6">
          <RoleToggle value={role} onChange={setRole} />

          {!completingGoogleProfile && (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
                  Nome completo
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="voce@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary-600 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  "Criar conta"
                )}
              </button>
            </form>
          )}

          {completingGoogleProfile && error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          {!completingGoogleProfile && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-3 text-muted-foreground">ou</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {completingGoogleProfile ? "Confirmar com Google" : "Continuar com Google"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Ao criar a conta, você declara ter lido os{" "}
          <Link href="/termos" className="font-medium text-primary-700 hover:text-primary-600">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="font-medium text-primary-700 hover:text-primary-600">
            Política de Privacidade
          </Link>
          . Os textos ainda dependem de revisão jurídica.
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-600">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
