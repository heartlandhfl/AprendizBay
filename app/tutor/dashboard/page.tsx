import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";

function TutorDashboardContent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-surface p-8 shadow-soft ring-1 ring-border/60">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu painel</h1>
        <p className="mt-2 text-muted-foreground">
          Em breve você poderá gerenciar seu perfil, turmas e agendamentos aqui.
        </p>
      </div>
    </div>
  );
}

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <TutorDashboardContent />
      </RequireAuth>
    </Suspense>
  );
}
