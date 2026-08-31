"use client";

import Link from "next/link";
import { HUB_CATALOG_COPY, TUTOR_CATALOG_COPY, TUTOR_PROFILE_COPY } from "@/lib/tutors/catalog";

export type CatalogProblemKind = "unavailable" | "error";
export type CatalogProblemScope = "tutors" | "profile" | "hubs";

const COPY = {
  tutors: TUTOR_CATALOG_COPY,
  profile: TUTOR_PROFILE_COPY,
  hubs: HUB_CATALOG_COPY,
} as const;

interface CatalogLoadStateProps {
  kind: CatalogProblemKind;
  scope?: CatalogProblemScope;
  onRetry?: () => void;
}

export default function CatalogLoadState({
  kind,
  scope = "tutors",
  onRetry,
}: CatalogLoadStateProps) {
  const copy = COPY[scope][kind];

  return (
    <div className="rounded-2xl bg-muted/60 px-6 py-16 text-center" role="alert">
      <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Tentar novamente
          </button>
        ) : null}
        <Link
          href="/search"
          className="rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Voltar à busca
        </Link>
      </div>
    </div>
  );
}
