"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  MessageCircle,
  Search,
  User,
  Users,
} from "lucide-react";
import StudentDashboardSkeleton from "@/components/student-dashboard/StudentDashboardSkeleton";
import TutorCard from "@/components/search/TutorCard";
import { STUDENT_ACCOUNT_SETUP_PATH } from "@/lib/auth/account-setup";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  fetchTutorLessonDetails,
  subscribeToStudentBookings,
} from "@/lib/bookings/service";
import { subscribeToUserConversations } from "@/lib/conversations/service";
import type { Conversation } from "@/lib/conversations/types";
import { otherParticipantName, previewMessage } from "@/lib/conversations/ids";
import { fetchOpenCollectiveHubs, formatHubPrice } from "@/lib/hubs/service";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { formatVacancyLabel } from "@/lib/hubs/public";
import { firstDisplayName } from "@/lib/email/templates";
import { modalityLabel } from "@/lib/tutors/format";
import { fetchVerifiedTutors } from "@/lib/tutors/client";
import type { Tutor } from "@/lib/mock-tutors";
import {
  buildActiveBookingItems,
  buildPendingActions,
  formatLessonTypeLabel,
  getLessonCta,
  getNextConfirmedLesson,
  splitDateTime,
} from "@/lib/student-dashboard/bookings";
import { getDashboardContextualMessage } from "@/lib/student-dashboard/contextual-message";
import { subscribeToStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import {
  buildProfileSummaryFields,
  hasProfileSummaryData,
} from "@/lib/student-dashboard/profile-summary";
import { inferSubjectsFromBookings } from "@/lib/student-dashboard/profile";
import {
  hasRecommendationData,
  recommendProfessors,
} from "@/lib/student-dashboard/recommendations";
import { buildSearchUrlFromProfile } from "@/lib/student-dashboard/search-params";
import { subscribeToStudentReviewBookingIds } from "@/lib/reviews/client";
import type { EnrichedStudentBooking, StudentLearningProfile } from "@/lib/student-dashboard/types";

function StudentAvatar({
  displayName,
  photoUrl,
}: {
  displayName: string;
  photoUrl?: string | null;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

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

export default function StudentDashboardContent() {
  const router = useRouter();
  const { user, userDoc } = useAuth();
  const [bookings, setBookings] = useState<EnrichedStudentBooking[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collectiveHubs, setCollectiveHubs] = useState<CollectiveHubLive[]>([]);
  const [recommendedTutors, setRecommendedTutors] = useState<Tutor[]>([]);
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile>({});
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeBookings = subscribeToStudentBookings(
      user.uid,
      async (nextBookings) => {
        const enriched = await Promise.all(
          nextBookings.map(async (booking) => {
            const details = await fetchTutorLessonDetails(booking.tutorId);
            return {
              booking,
              tutorName: details.name,
              subject: details.subject,
              modality: details.modality,
            };
          }),
        );
        setBookings(enriched);
        setBookingsLoading(false);
      },
      () => {
        console.error("student dashboard bookings subscription failed");
        setBookingsLoading(false);
      },
    );

    const unsubscribeConversations = subscribeToUserConversations(
      user.uid,
      setConversations,
      () => {
        console.error("student dashboard conversations subscription failed");
      },
    );

    const unsubscribeReviews = subscribeToStudentReviewBookingIds(
      user.uid,
      setReviewedBookingIds,
      () => {
        console.error("student dashboard reviews subscription failed");
      },
    );

    const unsubscribeProfile = subscribeToStudentLearningProfile(
      user.uid,
      (profile) => {
        setLearningProfile(profile);
        setProfileLoaded(true);
      },
      () => {
        console.error("student dashboard profile subscription failed");
        setProfileLoaded(true);
      },
    );

    void fetchOpenCollectiveHubs()
      .then((result) => {
        if (result.state === "ok") {
          setCollectiveHubs(result.items.slice(0, 4));
        }
      })
      .catch(() => {
        console.error("student dashboard collective hubs fetch failed");
      })
      .finally(() => {
        setHubsLoading(false);
      });

    return () => {
      unsubscribeBookings();
      unsubscribeConversations();
      unsubscribeReviews();
      unsubscribeProfile();
    };
  }, [user]);

  const subjectsFromBookings = useMemo(
    () => inferSubjectsFromBookings(bookings.map((entry) => entry.subject)),
    [bookings],
  );

  const recommendationContext = useMemo(
    () => ({
      profile: learningProfile,
      subjectsFromBookings,
      excludeTutorIds: bookings.map((entry) => entry.booking.tutorId),
    }),
    [bookings, learningProfile, subjectsFromBookings],
  );

  const canRecommend = hasRecommendationData(recommendationContext);

  useEffect(() => {
    if (!canRecommend) {
      setRecommendedTutors([]);
      setRecommendationsLoading(false);
      return;
    }

    let cancelled = false;
    setRecommendationsLoading(true);

    void fetchVerifiedTutors()
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.state === "ok") {
          setRecommendedTutors(recommendProfessors(result.items, recommendationContext));
        } else {
          setRecommendedTutors([]);
        }
      })
      .catch(() => {
        console.error("student dashboard recommendations fetch failed");
        if (!cancelled) {
          setRecommendedTutors([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecommendationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRecommend, recommendationContext]);

  const nextLesson = useMemo(() => getNextConfirmedLesson(bookings), [bookings]);
  const activeBookings = useMemo(() => buildActiveBookingItems(bookings), [bookings]);
  const pendingActions = useMemo(
    () =>
      user
        ? buildPendingActions({
            bookings,
            reviewedBookingIds,
            conversations,
            studentId: user.uid,
          })
        : [],
    [bookings, conversations, reviewedBookingIds, user],
  );
  const reviewActions = pendingActions.filter((action) => action.type === "review_pending");
  const unreadMessageCount = pendingActions.filter((action) => action.type === "new_message").length;

  const displayName = userDoc?.displayName || user?.displayName || "Aluno";
  const firstName = firstDisplayName(displayName);
  const contextualMessage = getDashboardContextualMessage({
    nextLesson,
    pendingActionCount: pendingActions.length,
    unreadMessageCount,
  });
  const searchHref = buildSearchUrlFromProfile(learningProfile);
  const profileSummaryFields = buildProfileSummaryFields(learningProfile);
  const messagePreview = conversations.slice(0, 3);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildSearchUrlFromProfile(learningProfile, searchQuery));
  }

  if (bookingsLoading || !profileLoaded) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Olá, {firstName}! 👋
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{contextualMessage}</p>
          </div>
          <StudentAvatar displayName={displayName} photoUrl={userDoc?.photoUrl} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={searchHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            Encontrar um professor
          </Link>
          <Link
            href="/bookings"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Minhas aulas
          </Link>
          <Link
            href="/mensagens"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Mensagens
          </Link>
        </div>
      </header>

      {nextLesson ? (
        <section
          aria-labelledby="next-lesson-title"
          className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-soft-lg"
        >
          <p id="next-lesson-title" className="text-sm font-medium text-primary-100">
            Próxima aula
          </p>
          <h2 className="mt-2 text-2xl font-bold">{nextLesson.subject}</h2>
          <p className="mt-1 text-primary-50">com {nextLesson.tutorName}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-primary-200">Data</dt>
              <dd className="font-medium">{splitDateTime(nextLesson.booking.scheduledAt).date}</dd>
            </div>
            <div>
              <dt className="text-primary-200">Horário</dt>
              <dd className="font-medium">{splitDateTime(nextLesson.booking.scheduledAt).time}</dd>
            </div>
            <div>
              <dt className="text-primary-200">Modalidade</dt>
              <dd className="font-medium">{modalityLabel(nextLesson.modality)}</dd>
            </div>
            <div>
              <dt className="text-primary-200">Tipo de aula</dt>
              <dd className="font-medium">{formatLessonTypeLabel(nextLesson.booking.type)}</dd>
            </div>
          </dl>
          {(() => {
            const cta = getLessonCta(nextLesson.booking, nextLesson.modality);
            return (
              <Link
                href={cta.href}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                {cta.label}
              </Link>
            );
          })()}
        </section>
      ) : (
        <section className="rounded-3xl bg-surface p-6 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-lg font-semibold text-foreground">
            Você ainda não tem uma próxima aula.
          </p>
          <Link
            href={searchHref}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
          >
            Encontrar um professor
          </Link>
        </section>
      )}

      {(activeBookings.length > 0 || reviewActions.length > 0) && (
        <section aria-labelledby="active-bookings-title" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="active-bookings-title" className="text-xl font-bold text-foreground">
              Atividade nas reservas
            </h2>
            <Link
              href="/bookings"
              className="text-sm font-medium text-primary-700 hover:text-primary-600"
            >
              Ver minhas aulas
            </Link>
          </div>

          <ul className="space-y-3">
            {reviewActions.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-semibold text-foreground">{action.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}

            {activeBookings.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{item.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.tutorName} · {item.scheduledLabel}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      {item.statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="find-professor-title"
        className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60"
      >
        <h2 id="find-professor-title" className="text-xl font-bold text-foreground">
          Encontrar um professor
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use o marketplace da Aprendiz Bay com suas preferências de aprendizagem.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                learningProfile.preferredSubject?.trim() || "Buscar professores ou matérias"
              }
              aria-label="Buscar professores"
              className="h-12 w-full rounded-2xl border border-border bg-muted/40 pl-11 pr-4 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Encontrar um professor
          </button>
        </form>
      </section>

      <section aria-labelledby="recommendations-title" className="space-y-4">
        <h2 id="recommendations-title" className="text-xl font-bold text-foreground">
          Professores recomendados
        </h2>

        {recommendationsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
          </div>
        ) : recommendedTutors.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendedTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        ) : canRecommend ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">
              Não encontramos professores compatíveis com suas preferências agora. Tente buscar no
              marketplace.
            </p>
            <Link
              href={searchHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
            >
              Encontrar um professor
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">
              Complete seu perfil ou reserve uma aula para receber recomendações personalizadas.
            </p>
            <Link
              href={STUDENT_ACCOUNT_SETUP_PATH}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Editar meu perfil
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="group-learning-title" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="group-learning-title" className="text-xl font-bold text-foreground">
            Aprenda em grupo
          </h2>
          <Link
            href={searchHref}
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Ver turmas
          </Link>
        </div>

        {hubsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-muted/70" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted/70" />
          </div>
        ) : collectiveHubs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {collectiveHubs.map((hub) => (
              <article
                key={hub.id}
                className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
              >
                <p className="text-sm font-medium text-primary-600">{hub.subject || "Turma"}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{hub.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{hub.tutorName || "Professor"}</p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>{hub.scheduledDate || hub.schedule}</span>
                  </div>
                  {hub.startTime && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span>{hub.startTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    <span>{formatVacancyLabel(hub.confirmedStudents, hub.maxStudents)}</span>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {formatHubPrice(hub.currentPrice)}
                    <span className="font-normal text-muted-foreground"> · </span>
                    {hub.modality === "presencial" ? "Presencial" : "Online"}
                  </p>
                  <Link
                    href={`/turmas/${encodeURIComponent(hub.id)}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white"
                  >
                    Ver turma
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">
              Nenhuma turma aberta no momento. Você também pode começar com uma aula individual.
            </p>
            <Link
              href={searchHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
            >
              Encontrar um professor
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="messages-title" className="space-y-4">
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

        {messagePreview.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <MessageCircle className="mx-auto h-8 w-8 text-primary-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma conversa ainda. Envie uma mensagem a partir do perfil de um professor.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messagePreview.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/mensagens?conversa=${encodeURIComponent(conversation.id)}`}
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

      <section aria-labelledby="profile-summary-title" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="profile-summary-title" className="text-xl font-bold text-foreground">
            Meu perfil de aprendizagem
          </h2>
          <Link
            href={STUDENT_ACCOUNT_SETUP_PATH}
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Editar meu perfil
          </Link>
        </div>

        {hasProfileSummaryData(learningProfile) ? (
          <dl className="grid gap-4 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:grid-cols-2">
            {profileSummaryFields.map((field) => (
              <div key={field.label}>
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card ring-1 ring-border/50">
            <User className="mx-auto h-8 w-8 text-primary-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Seu perfil ainda não tem preferências de aprendizagem.
            </p>
            <Link
              href={STUDENT_ACCOUNT_SETUP_PATH}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
            >
              Editar meu perfil
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-muted/30 p-5 ring-1 ring-border/40">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">Precisa gerenciar pagamentos ou avaliações?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse minhas aulas para pagar, cancelar, avaliar ou ver o histórico completo.
            </p>
            <Link
              href="/bookings"
              className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary-700 hover:text-primary-600"
            >
              Ir para minhas aulas
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
