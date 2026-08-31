"use client";

import Link from "next/link";

export default function TutorProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">
        Não foi possível carregar o perfil
      </h1>
      <p className="mt-3 text-muted-foreground">
        Tente novamente em instantes ou volte à busca de professores.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
        >
          Tentar novamente
        </button>
        <Link
          href="/professores"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Buscar professores
        </Link>
      </div>
    </div>
  );
}
