"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Info,
  Loader2,
  Monitor,
  User,
} from "lucide-react";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import LessonStatusBadge from "@/components/lessons/LessonStatusBadge";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking } from "@/lib/bookings/types";
import { COMPLETE_COPY } from "@/lib/bookings/complete-lesson";
import {
  fetchTutorLessonDetails,
  fetchUserDisplayName,
  markBookingCompleted,
  subscribeToBooking,
} from "@/lib/bookings/service";
import { fetchHub } from "@/lib/hubs/service";
import { canAccessLesson, LESSON_ACCESS_DENIED_MESSAGE } from "@/lib/lessons/access";
import { lessonBackLink } from "@/lib/lessons/paths";
import { buildLessonView } from "@/lib/lessons/view";
import type { Modality } from "@/lib/mock-tutors";

interface LessonExperienceProps {
  bookingId: string;
}

interface LessonMeta {
  tutorName: string;
  studentName: string;
  subject: string;
  modality: Modality;
}

export default function LessonExperience({ bookingId }: LessonExperienceProps) {
  const { user, userDoc } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meta, setMeta] = useState<LessonMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDenied(false);
    setBooking(null);
    setMeta(null);

    const unsubscribe = subscribeToBooking(
      bookingId,
      async (nextBooking) => {
        if (cancelled) {
          return;
        }

        if (!nextBooking || !canAccessLesson(nextBooking, user.uid)) {
          setBooking(null);
          setMeta(null);
          setDenied(true);
          setLoading(false);
          return;
        }

        setDenied(false);
        setBooking(nextBooking);

        try {
          const [tutor, studentName, hub] = await Promise.all([
            fetchTutorLessonDetails(nextBooking.tutorId),
            fetchUserDisplayName(nextBooking.studentId),
            nextBooking.hubId ? fetchHub(nextBooking.hubId) : Promise.resolve(null),
          ]);

          if (cancelled) {
            return;
          }

          setMeta({
            tutorName: tutor.name,
            studentName,
            subject: tutor.subject,
            modality: hub?.modality ?? tutor.modality,
          });
        } catch {
          if (!cancelled) {
            setMeta({
              tutorName: "Professor",
              studentName: "Aluno",
              subject: "Disciplina não informada",
              modality: "online",
            });
            setError("Não foi possível carregar todos os detalhes da aula.");
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      },
      () => {
        if (cancelled) {
          return;
        }
        setBooking(null);
        setMeta(null);
        setDenied(true);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bookingId, user]);

  async function handleComplete() {
    setCompleting(true);
    setError(null);

    try {
      await markBookingCompleted(bookingId);
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Não foi possível marcar a aula como concluída.",
      );
    } finally {
      setCompleting(false);
    }
  }

  const back = lessonBackLink(userDoc?.role);
  const view =
    booking && meta && user
      ? buildLessonView(
          booking,
          {
            ...meta,
            viewerRole: userDoc?.role,
          },
          user.uid,
          now,
        )
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando aula...</span>
      </div>
    );
  }

  if (denied || !view) {
    return (
      <LessonUnavailable backHref={back.href} backLabel={back.label} />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={view.backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {view.backLabel}
      </Link>

      <article className="overflow-hidden rounded-3xl bg-surface shadow-soft-lg ring-1 ring-border/60">
        <header className="flex flex-col gap-3 border-b border-border/60 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Página da aula
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {view.subject}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{view.typeLabel}</p>
          </div>
          <LessonStatusBadge status={view.status} />
        </header>

        <dl className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
          <LessonField icon={User} label="Nome do professor" value={view.tutorName} />
          <LessonField icon={User} label="Nome do aluno" value={view.studentName} />
          <LessonField icon={BookOpen} label="Disciplina" value={view.subject} />
          <LessonField icon={Calendar} label="Data" value={view.dateLabel} />
          <LessonField icon={Clock} label="Horário" value={view.timeLabel} />
          <LessonField icon={Monitor} label="Modalidade" value={view.modalityLabel} />
          <LessonField
            icon={Info}
            label="Status da aula"
            value={view.statusLabel}
          />
        </dl>

        {error && (
          <p className="mx-4 mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6" role="alert">
            {error}
          </p>
        )}

        {view.showJoinSection && (
          <div className="border-t border-border/60 px-4 py-5 sm:px-6">
            <h2 className="text-sm font-semibold text-foreground">Link para entrar na aula</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A reunião acontece em um site externo. Nada de videoconferência é hospedado aqui.
            </p>
            <div className="mt-4">
              <JoinLessonButton
                meetingUrl={view.meetingUrl}
                missingMessage={
                  view.missingMeetingMessage ??
                  "O link da reunião ainda não está disponível."
                }
              />
            </div>
          </div>
        )}

        <div className="border-t border-border/60 px-4 py-5 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">Informações importantes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {view.importantNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        {view.showCompleteButton && (
          <div className="border-t border-border/60 px-4 py-5 sm:px-6">
            <button
              type="button"
              onClick={() => void handleComplete()}
              disabled={!view.canComplete || completing}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {completing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {COMPLETE_COPY.tutorSubmitting}
                </>
              ) : (
                COMPLETE_COPY.tutorButton
              )}
            </button>
            {view.completeHint && (
              <p className="mt-2 text-xs text-muted-foreground">{view.completeHint}</p>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

function LessonUnavailable({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
        <h1 className="text-xl font-bold text-foreground">Aula indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">{LESSON_ACCESS_DENIED_MESSAGE}</p>
      </div>
    </div>
  );
}

function LessonField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-muted/40 px-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}
