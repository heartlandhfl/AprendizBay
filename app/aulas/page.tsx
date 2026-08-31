import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import LessonRoute from "@/components/lessons/LessonRoute";

export const metadata = {
  title: "Aula — Aprendiz Bay",
  description: "Detalhes da sua aula no Aprendiz Bay.",
  robots: { index: false, follow: false },
};

export default function AulasPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <LessonRoute />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
