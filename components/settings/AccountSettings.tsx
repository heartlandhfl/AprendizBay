"use client";

import Link from "next/link";
import { Cookie, Settings, Shield, UserRound } from "lucide-react";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import { useAuth } from "@/lib/auth/AuthContext";
import { openCookiePreferences, readCookieConsent } from "@/lib/legal/cookie-consent";
import { useEffect, useState } from "react";
import { COOKIE_PREFERENCES_EVENT } from "@/lib/legal/constants";

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  tutor: "Professor",
  admin: "Administrador",
};

export default function AccountSettings() {
  const { user, userDoc } = useAuth();
  const [optionalCookies, setOptionalCookies] = useState<boolean | null>(null);

  useEffect(() => {
    function syncConsent() {
      const decision = readCookieConsent();
      setOptionalCookies(decision ? decision.optional : null);
    }

    syncConsent();
    window.addEventListener(COOKIE_PREFERENCES_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  if (!user) {
    return null;
  }

  const displayName = userDoc?.displayName || user.displayName || "Usuário";
  const email = userDoc?.email || user.email || "—";
  const roleLabel = userDoc?.role ? ROLE_LABELS[userDoc.role] ?? userDoc.role : "—";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-primary-600">
          <Settings className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie sua conta, cookies e o direito de exclusão previsto na LGPD.
        </p>
      </div>

      <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
        <div className="flex items-center gap-2 text-foreground">
          <UserRound className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Sua conta</h2>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</dt>
            <dd className="mt-1 text-sm text-foreground">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-mail</dt>
            <dd className="mt-1 text-sm text-foreground">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Perfil</dt>
            <dd className="mt-1 text-sm text-foreground">{roleLabel}</dd>
          </div>
        </dl>
        {userDoc?.role === "tutor" && (
          <Link
            href="/tutor/settings"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Editar perfil de professor
          </Link>
        )}
      </section>

      <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
        <div className="flex items-center gap-2 text-foreground">
          <Cookie className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Cookies</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cookies necessários ficam sempre ativos (login e esta preferência).
          Opcionais de métricas ou marketing não estão em uso agora.
          {optionalCookies === null
            ? " Você ainda não registrou uma escolha."
            : optionalCookies
              ? " Sua escolha atual: aceitar opcionais, se forem habilitados."
              : " Sua escolha atual: somente cookies necessários."}
        </p>
        <button
          type="button"
          onClick={() => openCookiePreferences()}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
        >
          Alterar preferência de cookies
        </button>
      </section>

      <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
        <div className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Documentos legais</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Os textos de Termos e Privacidade estão em português (pt-BR) e ainda
          dependem de revisão jurídica antes de valerem como versão publicada.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/termos"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Termos de Uso
          </Link>
          <Link
            href="/privacidade"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Política de Privacidade
          </Link>
        </div>
      </section>

      <DeleteAccountSection />
    </div>
  );
}
