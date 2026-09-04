"use client";

import Link from "next/link";
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
          Aulas confirmadas e pagas, além de turmas coletivas publicadas.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-muted/70" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted/70" />
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
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    {lesson.kind === "individual" ? lesson.studentName : lesson.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{lesson.subject}</p>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-medium text-foreground">{lesson.dateLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Horário</dt>
                  <dd className="font-medium text-foreground">{lesson.timeLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Modalidade</dt>
                  <dd className="font-medium text-foreground">{lesson.modalityLabel}</dd>
                </div>
                {lesson.kind === "individual" ? (
                  <div>
                    <dt className="text-muted-foreground">Aluno</dt>
                    <dd className="font-medium text-foreground">{lesson.studentName}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.lessonHref && lesson.lessonCtaLabel ? (
                  <Link
                    href={lesson.lessonHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    {lesson.lessonCtaLabel}
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
