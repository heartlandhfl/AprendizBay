"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import AvatarUpload from "@/components/uploads/AvatarUpload";
import CredentialUpload from "@/components/uploads/CredentialUpload";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";
import { resubmitTutorVerificationRequest } from "@/lib/tutors/review-client";
import { canTutorResubmit, resolveVerificationStatus } from "@/lib/tutors/verification";
import VerificationStatusBanner from "@/components/tutors/VerificationStatusBanner";

export default function TutorProfileSettings() {
  const { user, userDoc } = useAuth();
  const { tutorDoc, loading, isProfileComplete } = useTutorProfile();
  const verificationStatus = tutorDoc ? resolveVerificationStatus(tutorDoc) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="text-sm text-muted-foreground">Carregando perfil...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isProfileComplete) {
    return (
      <section className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
        <h1 className="text-xl font-bold text-foreground">Perfil incompleto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete o cadastro de professor antes de editar foto e documentos.
        </p>
        <Link
          href="/tutor/onboarding"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Completar cadastro
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-primary-600">
          <Settings className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Configurações do perfil</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualize sua foto e documentos de verificação.
        </p>
      </div>

      <div className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
        <AvatarUpload
          userId={user.uid}
          tutorId={user.uid}
          currentUrl={tutorDoc?.avatarUrl ?? userDoc?.photoUrl}
        />
      </div>

      <VerificationStatusBanner />

      <div className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
        <CredentialUpload
          tutorId={user.uid}
          currentFileName={tutorDoc?.credentialFileName}
          onUploaded={() => {
            if (verificationStatus && canTutorResubmit(verificationStatus)) {
              void resubmitTutorVerificationRequest();
            }
          }}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Para cookies, privacidade ou exclusão da conta, abra{" "}
        <Link href="/configuracoes" className="font-medium text-primary-700 hover:text-primary-600">
          Configurações
        </Link>
        .
      </p>
    </section>
  );
}
