import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada — Aprendiz Bay",
  description: "Esse endereço não existe ou foi removido.",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">404</p>
      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
        Página não encontrada
      </h1>
      <p className="mt-3 text-muted-foreground">
        Esse endereço não existe ou foi removido. Volte ao início ou busque um professor.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
        >
          Ir para o início
        </Link>
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
