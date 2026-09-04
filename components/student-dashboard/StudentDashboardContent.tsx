"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";
import IncompleteStudentProfileBanner from "@/components/student-dashboard/IncompleteStudentProfileBanner";
import StudentLearningProfileModal from "@/components/student-dashboard/StudentLearningProfileModal";
import TutorCard from "@/components/search/TutorCard";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  fetchTutorLessonDetails,
  formatBookingDate,
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
  buildLearningSummary,
  buildPendingActions,
  formatLessonTypeLabel,
  getLessonCta,
  getNextLesson,
  splitDateTime,
} from "@/lib/student-dashboard/bookings";
import { subscribeToStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import {
  inferSubjectsFromBookings,
  shouldPromptProfileCompletion,
} from "@/lib/student-dashboard/profile";
import {
  hasRecommendationData,
  recommendProfessors,
} from "@/lib/student-dashboard/recommendations";
import { subscribeToStudentReviewBookingIds } from "@/lib/reviews/client";
import type { EnrichedStudentBooking, StudentLearningProfile } from "@/lib/student-dashboard/types";

export default function StudentDashboardContent() {
  const router = useRouter();
  const { user, userDoc } = useAuth();
  const [bookings, setBookings] = useState<EnrichedStudentBooking[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collectiveHubs, setCollectiveHubs] = useState<CollectiveHubLive[]>([]);
  const [recommendedTutors, setRecommendedTutors] = useState<Tutor[]>([]);
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile>({});
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);

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
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar suas aulas.");
        setLoading(false);
      },
    );

    const unsubscribeConversations = subscribeToUserConversations(
      user.uid,
      setConversations,
    );

    const unsubscribeReviews = subscribeToStudentReviewBookingIds(
      user.uid,
      setReviewedBookingIds,
    );

    const unsubscribeProfile = subscribeToStudentLearningProfile(
      user.uid,
      setLearningProfile,
    );

    void fetchOpenCollectiveHubs().then((result) => {
      if (result.state === "ok") {
        setCollectiveHubs(result.items.slice(0, 4));
      }
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

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      const context = {
        profile: learningProfile,
        subjectsFromBookings,
        excludeTutorIds: bookings.map((entry) => entry.booking.tutorId),
      };

      if (!hasRecommendationData(context)) {
        if (!cancelled) {
          setRecommendedTutors([]);
        }
        return;
      }

      const result = await fetchVerifiedTutors();
      if (cancelled) {
        return;
      }

      if (result.state === "ok") {
        setRecommendedTutors(recommendProfessors(result.items, context));
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [bookings, learningProfile, subjectsFromBookings]);

  const nextLesson = useMemo(() => getNextLesson(bookings), [bookings]);
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
  const learningSummary = useMemo(() => buildLearningSummary(bookings), [bookings]);
  const showProfileBanner = shouldPromptProfileCompletion(
    learningProfile,
    bookings.length,
  );

  const displayName = userDoc?.displayName || user?.displayName || "Aluno";
  const firstName = firstDisplayName(displayName);
  const messagePreview = conversations.slice(0, 3);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    const params = new URLSearchParams();
    if (trimmed) {
      params.set("q", trimmed);
    }
    router.push(`/search?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando painel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Seu centro de aprendizagem na Aprendiz Bay.
          </p>
        </div>

        <div className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60">
          <p className="text-sm font-semibold text-primary-700">O que você quer aprender?</p>
          <form onSubmit={handleSearch} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar professores"
                aria-label="Buscar professores"
                className="h-12 w-full rounded-2xl border border-border bg-muted/40 pl-11 pr-4 text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Buscar professores
            </button>
          </form>
          <div className="mt-3">
            <Link
              href="/search?lessonType=coletivo"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600"
            >
              Encontrar aulas em grupo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showProfileBanner && (
        <IncompleteStudentProfileBanner onComplete={() => setShowProfileModal(true)} />
      )}

      {nextLesson ? (
        <section className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-soft-lg">
          <p className="text-sm font-medium text-primary-100">Próxima aula</p>
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
          <p className="text-lg font-semibold text-foreground">Nenhuma aula agendada</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Encontre um professor e reserve sua próxima aula.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
          >
            Buscar professores
          </Link>
        </section>
      )}

      {pendingActions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Ações pendentes</h2>
          <ul className="space-y-3">
            {pendingActions.map((action) => (
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
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-foreground">Minha aprendizagem</h2>
          <Link
            href="/bookings"
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Ver todas as minhas aulas
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Próximos encontros", value: learningSummary.upcomingCount },
            { label: "Meus professores", value: learningSummary.professorCount },
            { label: "Minhas turmas", value: learningSummary.classCount },
            { label: "Histórico", value: learningSummary.historyCount },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50"
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
            </article>
          ))}
        </div>

        {learningSummary.upcomingPreview.length > 0 && (
          <ul className="space-y-3">
            {learningSummary.upcomingPreview.map((entry) => (
              <li key={entry.booking.id}>
                <Link
                  href={getLessonCta(entry.booking, entry.modality).href}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{entry.subject}</p>
                    <p className="text-muted-foreground">
                      {entry.tutorName} · {formatBookingDate(entry.booking.scheduledAt)}
                    </p>
                  </div>
                  <span className="font-medium text-primary-700">Ver aula</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-foreground">Aprenda em grupo</h2>
          <Link
            href="/search?lessonType=coletivo"
            className="text-sm font-medium text-primary-700 hover:text-primary-600"
          >
            Ver todas as turmas
          </Link>
        </div>

        {collectiveHubs.length > 0 ? (
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
                    href={`/turmas?id=${encodeURIComponent(hub.id)}`}
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
              Não encontrou uma turma? Procure um professor para uma aula individual.
            </p>
            <Link
              href="/search"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white"
            >
              Buscar professores
            </Link>
          </div>
        )}
      </section>

      {recommendedTutors.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Professores que podem combinar com você
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {recommendedTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-foreground">Mensagens</h2>
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
                    {user
                      ? otherParticipantName(conversation, user.uid)
                      : "Conversa"}
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

      {showProfileModal && user && (
        <StudentLearningProfileModal
          studentId={user.uid}
          initialProfile={learningProfile}
          onClose={() => setShowProfileModal(false)}
          onSaved={setLearningProfile}
        />
      )}
    </div>
  );
}
