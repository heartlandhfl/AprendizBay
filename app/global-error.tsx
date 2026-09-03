"use client";

import { useEffect } from "react";
import { captureClientException } from "@/lib/observability/sentry-client";
import { fontVariables } from "@/app/fonts";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <html lang="pt-BR" className={fontVariables}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-6 font-sans text-foreground">
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
