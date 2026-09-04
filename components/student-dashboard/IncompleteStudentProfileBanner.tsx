"use client";

import { AlertCircle } from "lucide-react";

interface IncompleteStudentProfileBannerProps {
  onComplete: () => void;
}

export default function IncompleteStudentProfileBanner({
  onComplete,
}: IncompleteStudentProfileBannerProps) {
  return (
    <section
      className="rounded-3xl border border-primary-200 bg-primary-50 p-5 shadow-soft ring-1 ring-primary-200/60"
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-primary-950">
              Complete seu perfil para encontrar professores mais adequados.
            </h2>
            <p className="mt-1 text-sm text-primary-900/80">
              Informe matéria, nível e modalidade preferida para receber sugestões melhores.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Completar perfil
        </button>
      </div>
    </section>
  );
}
