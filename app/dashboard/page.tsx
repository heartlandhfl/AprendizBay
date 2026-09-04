import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import StudentHome from "@/components/dashboard/StudentHome";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Início — Aprendiz Bay",
  robots: PRIVATE_ROBOTS,
};

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["student"]}>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <StudentHome />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
