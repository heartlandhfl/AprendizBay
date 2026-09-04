"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import StudentBookingsList from "@/components/bookings/StudentBookingsList";
import TutorConfirmedBookings from "@/components/bookings/TutorConfirmedBookings";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";
import { useAuth } from "@/lib/auth/AuthContext";
import { isLecturerRole, normalizeRole } from "@/lib/auth/roles";

export default function BookingsPageContent() {
  const { userDoc, loading } = useAuth();

  if (loading || !userDoc) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (isLecturerRole(userDoc.role)) {
    return (
      <div className="space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Minhas reservas</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Gerencie solicitações de aula, acompanhe pagamentos e abra suas aulas confirmadas.
            </p>
          </div>
          <Link
            href="/tutor/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ir para o painel completo
          </Link>
        </div>

        <TutorDashboardBookings embedded />
        <TutorConfirmedBookings showEmptyState />
      </div>
    );
  }

  if (normalizeRole(userDoc.role) === "student") {
    return <StudentBookingsList />;
  }

  return (
    <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
      <p className="text-lg font-semibold text-foreground">Reservas indisponíveis</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta área é destinada a alunos e professores. Use o painel administrativo para operações da
        plataforma.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
