"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { UpcomingProfessorLesson } from "@/lib/tutors/upcoming-lessons";

interface ProfessorUpcomingLessonsProps {
  lessons: UpcomingProfessorLesson[];
  loading: boolean;
}

export default function ProfessorUpcomingLessons({
  lessons,
  loading,
}: ProfessorUpcomingLessonsProps) {
  return (
    <section id="aulas" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Próximas aulas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aulas individuais e coletivas que já estão confirmadas ou publicadas.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
          <span className="sr-only">Carregando próximas aulas...</span>
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-lg font-semibold text-foreground">Você não tem aulas próximas.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aceite solicitações e publique turmas para preencher sua agenda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                    {lesson.typeLabel}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{lesson.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{lesson.whenLabel}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.lessonHref ? (
                  <Link
                    href={lesson.lessonHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    Entrar na aula
                  </Link>
                ) : null}
                {lesson.hubHref ? (
                  <Link
                    href={lesson.hubHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Ver turma
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
