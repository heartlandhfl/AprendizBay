import type { ReactNode } from "react";
import LegalReviewBanner from "@/components/legal/LegalReviewBanner";
import { LEGAL_LAST_UPDATED_LABEL } from "@/lib/legal/constants";

interface LegalDocumentProps {
  title: string;
  description: string;
  children: ReactNode;
  categoryLabel?: string | null;
  lastUpdatedLabel?: string;
  lastUpdatedPrefix?: string;
  showReviewBanner?: boolean;
}

export default function LegalDocument({
  title,
  description,
  children,
  categoryLabel = "Documentos legais",
  lastUpdatedLabel = LEGAL_LAST_UPDATED_LABEL,
  lastUpdatedPrefix = "Última atualização do rascunho:",
  showReviewBanner = true,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-5">
        {categoryLabel ? (
          <p className="text-sm font-medium text-primary-700">{categoryLabel}</p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          {lastUpdatedPrefix} {lastUpdatedLabel}.
        </p>
        {showReviewBanner ? <LegalReviewBanner /> : null}
      </header>

      <div className="legal-prose mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}
