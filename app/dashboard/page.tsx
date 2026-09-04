import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import StudentDashboardContent from "@/components/student-dashboard/StudentDashboardContent";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Início — Aprendiz Bay",
  description: "Seu centro de aprendizagem na Aprendiz Bay.",
  robots: PRIVATE_ROBOTS,
};

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["student"]} unauthorizedRedirectTo="/tutor/dashboard">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <StudentDashboardContent />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
