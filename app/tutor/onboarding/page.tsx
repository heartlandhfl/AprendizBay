"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/auth/RequireAuth";
import TutorOnboardingWizard from "@/components/tutors/TutorOnboardingWizard";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";

function TutorOnboardingContent() {
  const router = useRouter();
  const { loading, isProfileComplete } = useTutorProfile();

  useEffect(() => {
    if (!loading && isProfileComplete) {
      router.replace("/tutor/dashboard");
    }
  }, [isProfileComplete, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (isProfileComplete) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configure seu perfil de professor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete as etapas abaixo para começar a receber alunos na Aprendiz Bay.
        </p>
      </div>

      <TutorOnboardingWizard />
    </div>
  );
}

export default function TutorOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <TutorOnboardingContent />
      </RequireAuth>
    </Suspense>
  );
}
