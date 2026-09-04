"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/auth/RequireAuth";
import StudentAccountSetupForm from "@/components/account/StudentAccountSetupForm";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeToStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

function StudentAccountSetupContent() {
  const { user } = useAuth();
  const [initialProfile, setInitialProfile] = useState<StudentLearningProfile | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToStudentLearningProfile(user.uid, setInitialProfile);
  }, [user]);

  if (!initialProfile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  return <StudentAccountSetupForm initialProfile={initialProfile} />;
}

export default function StudentAccountSetupPageClient() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["student"]} unauthorizedRedirectTo="/tutor/dashboard">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Vamos preparar seu perfil
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Conte um pouco sobre você para encontrarmos as melhores oportunidades de
              aprendizagem.
            </p>
          </div>

          <StudentAccountSetupContent />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
