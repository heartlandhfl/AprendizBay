import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import TutorProfileSettings from "@/components/tutors/TutorProfileSettings";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Configurações do professor — Aprendiz Bay",
  robots: PRIVATE_ROBOTS,
};

export default function TutorSettingsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <TutorProfileSettings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
