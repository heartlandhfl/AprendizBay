"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { COOKIE_PREFERENCES_EVENT } from "@/lib/legal/constants";
import {
  hasCookieConsentDecision,
  writeCookieConsent,
} from "@/lib/legal/cookie-consent";

export default function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setReady(true);
    setOpen(!hasCookieConsentDecision());

    function handleOpenPreferences() {
      setOpen(true);
    }

    window.addEventListener(COOKIE_PREFERENCES_EVENT, handleOpenPreferences);
    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, handleOpenPreferences);
    };
  }, []);

  function accept(optional: boolean) {
    writeCookieConsent(optional);
    setOpen(false);
  }

  if (!ready || !open) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-5 shadow-soft-lg sm:p-6">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="text-base font-semibold text-foreground">
              Cookies e privacidade
            </h2>
            <p
              id="cookie-consent-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              Usamos cookies e armazenamentos{" "}
              <strong className="font-medium text-foreground">estritamente necessários</strong>{" "}
              para login, sessão e para lembrar esta escolha. Cookies opcionais
              de métricas ou marketing não estão ativos agora; sua resposta
              fica registrada caso sejam habilitados. Detalhes na{" "}
              <Link href="/privacidade#cookies" className="font-medium text-primary-700 hover:text-primary-600">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => accept(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Só necessários
              </button>
              <button
                type="button"
                onClick={() => accept(true)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
              >
                Aceitar opcionais
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
