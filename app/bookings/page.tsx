import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";

function BookingsContent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-surface p-8 shadow-soft ring-1 ring-border/60">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Minhas aulas</h1>
        <p className="mt-2 text-muted-foreground">
          Em breve você verá aqui suas aulas agendadas e histórico de reservas.
        </p>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <BookingsContent />
      </RequireAuth>
    </Suspense>
  );
}
