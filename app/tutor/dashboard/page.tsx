import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import ProfessorHome from "@/components/dashboard/ProfessorHome";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Painel do professor — Aprendiz Bay",
  robots: PRIVATE_ROBOTS,
};

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["lecturer"]}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <ProfessorHome />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
