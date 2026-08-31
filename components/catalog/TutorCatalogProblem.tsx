import Link from "next/link";
import { TUTOR_CATALOG_COPY, TUTOR_PROFILE_COPY } from "@/lib/tutors/catalog";

export default function TutorCatalogProblem({
  kind,
  scope = "tutors",
}: {
  kind: "unavailable" | "error";
  scope?: "tutors" | "profile";
}) {
  const copy = scope === "profile" ? TUTOR_PROFILE_COPY[kind] : TUTOR_CATALOG_COPY[kind];

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.description}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
        >
          Buscar professores
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
