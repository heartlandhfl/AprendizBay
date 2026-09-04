"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TutorAvailabilityEditor from "@/components/availability/TutorAvailabilityEditor";
import ProfessorDashboardSkeleton from "@/components/dashboard/ProfessorDashboardSkeleton";
import ProfessorEarningsSummary from "@/components/dashboard/ProfessorEarningsSummary";
import ProfessorHubsSection from "@/components/dashboard/ProfessorHubsSection";
import ProfessorStudentsPreview from "@/components/dashboard/ProfessorStudentsPreview";
import ProfessorUpcomingLessons from "@/components/dashboard/ProfessorUpcomingLessons";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";
import VerificationStatusBanner from "@/components/tutors/VerificationStatusBanner";
import { LECTURER_ACCOUNT_SETUP_PATH } from "@/lib/auth/account-setup";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  fetchUserDisplayName,
  subscribeToTutorOwnedBookings,
} from "@/lib/bookings/service";
import { subscribeToUserConversations } from "@/lib/conversations/service";
import type { Conversation } from "@/lib/conversations/types";
import { otherParticipantName, previewMessage } from "@/lib/conversations/ids";
import { subscribeToTutorCollectiveHubs } from "@/lib/hubs/service";
import type { Booking } from "@/lib/bookings/types";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import type { TutorEarningsSummary } from "@/lib/tutors/earnings";
import { fetchOwnTutorEarnings } from "@/lib/tutors/earnings-client";
import {
  firstNameFromDisplay,
  missingProfileStepLabels,
  profileCompletionHref,
} from "@/lib/tutors/profile-completion";
import { buildProfessorStudentsPreview } from "@/lib/tutors/students-preview";
import { buildUpcomingProfessorLessons } from "@/lib/tutors/upcoming-lessons";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";
import {
  formatProfileStatusSummary,
  getProfessorDashboardContextualMessage,
} from "@/lib/tutor-dashboard/contextual-message";

function ProfessorAvatar({
  displayName,
  photoUrl,
}: {
  displayName: string;
  photoUrl?: string | null;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "P";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-14 w-14 rounded-full object-cover ring-2 ring-border/60"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700 ring-2 ring-border/60"
    >
      {initial}
    </div>
  );
}

export default function ProfessorHome() {
  const { user, userDoc } = useAuth();
  const { tutorDoc, loading: profileLoading, completion } = useTutorProfile();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [earnings, setEarnings] = useState<TutorEarningsSummary | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
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
      () => {
        console.error("professor dashboard bookings subscription failed");
        setBookingsLoading(false);
      },
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
      () => {
        console.error("professor dashboard hubs subscription failed");
        setHubsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToUserConversations(
      user.uid,
      (nextConversations) => {
        setConversations(nextConversations);
        setMessagesLoading(false);
      },
      () => {
        console.error("professor dashboard conversations subscription failed");
        setMessagesLoading(false);
      },
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
    )
      .then((entries) => {
        if (!cancelled) {
          setStudentNames(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        console.error("professor dashboard student names fetch failed");
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
        }
      })
      .catch((error: unknown) => {
        console.error("professor earnings fetch failed", error);
        if (!cancelled) {
          setEarnings(null);
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

  const tutorProfileContext = useMemo(
    () =>
      tutorDoc
        ? {
            subject: tutorDoc.subject,
            modality: tutorDoc.modality,
          }
        : null,
    [tutorDoc],
  );

  const upcoming = useMemo(
    () =>
      buildUpcomingProfessorLessons(
        bookings,
        hubs,
        studentNames,
        tutorProfileContext,
        now,
      ),
    [bookings, hubs, now, studentNames, tutorProfileContext],
  );

  const students = useMemo(
    () =>
      buildProfessorStudentsPreview(bookings, studentNames, {
        tutorSubject: tutorDoc?.subject,
        hubs,
        now,
      }),
    [bookings, hubs, now, studentNames, tutorDoc?.subject],
  );

  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const unreadMessageCount = conversations.filter(
    (conversation) => conversation.lastSenderId && conversation.lastSenderId !== user?.uid,
  ).length;
  const messagePreview = conversations.slice(0, 3);

  const displayName = tutorDoc?.name || userDoc?.displayName || user?.displayName || "Professor";
  const firstName = firstNameFromDisplay(displayName);
  const profileStatus = formatProfileStatusSummary(completion, tutorDoc);
  const contextualMessage = getProfessorDashboardContextualMessage({
    pendingRequestCount: pendingCount,
    upcomingLessonCount: upcoming.length,
    unreadMessageCount,
  });
  const profileHref = profileCompletionHref(completion);
  const missingSteps = missingProfileStepLabels(completion.missing);

  if (profileLoading || bookingsLoading) {
    return <ProfessorDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <header id="inicio" className="scroll-mt-24 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Olá, Professor(a) {firstName}! 👋
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{contextualMessage}</p>
          </div>
          <ProfessorAvatar displayName={displayName} photoUrl={tutorDoc?.avatarUrl ?? userDoc?.photoUrl} />
        </div>

        <section
          aria-label="Status do perfil"
          className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{profileStatus.completionLabel}</p>
              {profileStatus.verificationLabel ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Verificação: {profileStatus.verificationLabel}
                </p>
              ) : null}
              {missingSteps.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Falta completar: {missingSteps.join(", ")}
                </p>
              ) : null}
            </div>
            {completion.percentage < 100 ? (
              <Link
                href={LECTURER_ACCOUNT_SETUP_PATH}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                Completar cadastro
              </Link>
            ) : (
              <Link
                href={profileHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ver meu perfil
              </Link>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={completion.percentage < 100 ? LECTURER_ACCOUNT_SETUP_PATH : "/tutor/settings"}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver meu perfil
          </Link>
          <Link
            href="#disponibilidade"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Gerenciar disponibilidade
          </Link>
          <Link
            href="/bookings"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver minhas aulas
          </Link>
          <Link
            href="/mensagens"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Mensagens
          </Link>
          <span
            aria-disabled="true"
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-5 text-sm font-medium text-muted-foreground"
            title="Em breve: descubra oportunidades de aula com base na demanda autorizada da plataforma."
          >
            Encontrar oportunidades (em breve)
          </span>
        </div>
      </header>

      <VerificationStatusBanner />

      <ProfessorUpcomingLessons lessons={upcoming} loading={bookingsLoading || hubsLoading} />

      <section id="solicitacoes" className="scroll-mt-24">
        <TutorDashboardBookings embedded />
      </section>

      <ProfessorEarningsSummary earnings={earnings} loading={earningsLoading} />

      <ProfessorStudentsPreview
        students={students}
        loading={bookingsLoading}
        tutorId={user?.uid ?? ""}
      />

      <ProfessorHubsSection hubs={hubs} loading={hubsLoading} />

      <section aria-labelledby="messages-title" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="messages-title" className="text-xl font-bold text-foreground">
            Mensagens
          </h2>
          <Link
            href="/mensagens"
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Ver mensagens
          </Link>
        </div>

        {messagesLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-muted/70" />
            <div className="h-20 animate-pulse rounded-2xl bg-muted/70" />
          </div>
        ) : messagePreview.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda. Quando um aluno enviar mensagem, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messagePreview.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/mensagens/${encodeURIComponent(conversation.id)}`}
                  className="block rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50 transition-colors hover:bg-muted/40"
                >
                  <p className="font-semibold text-foreground">
                    {user ? otherParticipantName(conversation, user.uid) : "Conversa"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {conversation.lastMessage
                      ? previewMessage(conversation.lastMessage)
                      : "Sem mensagens ainda"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="disponibilidade" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Disponibilidade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina os horários em que você pode receber novos alunos.
            </p>
          </div>
          <a
            href="#disponibilidade"
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Gerenciar disponibilidade
          </a>
        </div>
        <TutorAvailabilityEditor />
      </section>
    </div>
  );
}
