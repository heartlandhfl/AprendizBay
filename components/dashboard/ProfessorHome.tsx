"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TutorAvailabilityEditor from "@/components/availability/TutorAvailabilityEditor";
import TutorConfirmedBookings from "@/components/bookings/TutorConfirmedBookings";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";
import ProfessorEarningsSummary from "@/components/dashboard/ProfessorEarningsSummary";
import ProfessorHubsSection from "@/components/dashboard/ProfessorHubsSection";
import ProfessorStudentsPreview from "@/components/dashboard/ProfessorStudentsPreview";
import ProfessorUpcomingLessons from "@/components/dashboard/ProfessorUpcomingLessons";
import VerificationStatusBanner from "@/components/tutors/VerificationStatusBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { primaryNavItemsForRole } from "@/lib/auth/redirects";
import {
  fetchUserDisplayName,
  subscribeToTutorOwnedBookings,
} from "@/lib/bookings/service";
import { subscribeToTutorCollectiveHubs } from "@/lib/hubs/service";
import type { Booking } from "@/lib/bookings/types";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import type { TutorEarningsSummary } from "@/lib/tutors/earnings";
import { formatEarningsAmount } from "@/lib/tutors/earnings";
import { fetchOwnTutorEarnings } from "@/lib/tutors/earnings-client";
import {
  firstNameFromDisplay,
  profileCompletionHref,
} from "@/lib/tutors/profile-completion";
import { buildProfessorStudentsPreview, countActiveStudents } from "@/lib/tutors/students-preview";
import { buildUpcomingProfessorLessons } from "@/lib/tutors/upcoming-lessons";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";

function KpiCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60 transition-colors hover:bg-muted/40"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </Link>
  );
}

export default function ProfessorHome() {
  const { user, userDoc } = useAuth();
  const { tutorDoc, loading: profileLoading, completion } = useTutorProfile();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [earnings, setEarnings] = useState<TutorEarningsSummary | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorOwnedBookings(
      user.uid,
      (nextBookings) => {
        setBookings(nextBookings);
        setBookingsLoading(false);
      },
      () => setBookingsLoading(false),
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorCollectiveHubs(
      user.uid,
      (nextHubs) => {
        setHubs(nextHubs);
        setHubsLoading(false);
      },
      () => setHubsLoading(false),
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const studentIds = [...new Set(bookings.map((booking) => booking.studentId))];
    if (studentIds.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.all(
      studentIds.map(async (studentId) => [studentId, await fetchUserDisplayName(studentId)] as const),
    ).then((entries) => {
      if (!cancelled) {
        setStudentNames(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bookings]);

  useEffect(() => {
    let cancelled = false;
    setEarningsLoading(true);
    void fetchOwnTutorEarnings()
      .then((summary) => {
        if (!cancelled) {
          setEarnings(summary);
          setEarningsError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setEarningsError(
            error instanceof Error ? error.message : "Não foi possível carregar seus ganhos.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEarningsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = firstNameFromDisplay(
    tutorDoc?.name || userDoc?.displayName || user?.displayName,
  );
  const upcoming = useMemo(
    () => buildUpcomingProfessorLessons(bookings, hubs, studentNames, now),
    [bookings, hubs, now, studentNames],
  );
  const students = useMemo(
    () => buildProfessorStudentsPreview(bookings, studentNames),
    [bookings, studentNames],
  );
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const activeStudents = countActiveStudents(bookings);
  const navItems = primaryNavItemsForRole(userDoc?.role ?? "lecturer");

  return (
    <div className="space-y-8">
      <nav
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap"
        aria-label="Navegação do professor"
      >
        {navItems.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="shrink-0 rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <header id="inicio" className="scroll-mt-24 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Olá, {firstName}! 👋
        </h1>
        {!profileLoading ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Seu perfil está {completion.percentage}% completo
            </p>
            {completion.percentage < 100 ? (
              <Link
                href={profileCompletionHref(completion)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                Completar perfil
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <VerificationStatusBanner />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Novas solicitações" value={String(pendingCount)} href="#solicitacoes" />
        <KpiCard label="Próximas aulas" value={String(upcoming.length)} href="#aulas" />
        <KpiCard label="Alunos ativos" value={String(activeStudents)} href="#alunos" />
        {earnings && !earningsError ? (
          <KpiCard
            label="Ganhos"
            value={formatEarningsAmount(earnings.paidTotal)}
            href="#ganhos"
          />
        ) : null}
      </section>

      <ProfessorUpcomingLessons lessons={upcoming} loading={bookingsLoading || hubsLoading} />

      <section id="solicitacoes" className="scroll-mt-24">
        <TutorDashboardBookings embedded />
      </section>

      <ProfessorEarningsSummary
        earnings={earnings}
        loading={earningsLoading}
        error={earningsError}
      />

      <ProfessorHubsSection hubs={hubs} loading={hubsLoading} />

      {user ? (
        <ProfessorStudentsPreview
          students={students}
          loading={bookingsLoading}
          tutorId={user.uid}
        />
      ) : null}

      <section id="disponibilidade" className="scroll-mt-24 space-y-3">
        <TutorAvailabilityEditor />
      </section>

      <TutorConfirmedBookings showEmptyState />
    </div>
  );
}
