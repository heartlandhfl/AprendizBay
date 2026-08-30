"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";

export default function IncompleteProfileBanner() {
  const { loading, isProfileComplete } = useTutorProfile();

  if (loading || isProfileComplete) {
    return null;
  }

  return (
    <section
      className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-soft ring-1 ring-amber-200/60"
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-amber-950">Perfil incompleto</h2>
            <p className="mt-1 text-sm text-amber-900/80">
              Complete seu perfil de professor para aparecer na busca e começar a receber
              agendamentos de alunos.
            </p>
          </div>
        </div>

        <Link
          href="/tutor/onboarding"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Completar perfil
        </Link>
      </div>
    </section>
  );
}
