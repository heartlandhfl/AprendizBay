"use client";

import Link from "next/link";
import { conversationIdFor } from "@/lib/conversations/ids";
import type { ProfessorStudentPreview } from "@/lib/tutors/students-preview";

interface ProfessorStudentsPreviewProps {
  students: ProfessorStudentPreview[];
  loading: boolean;
  tutorId: string;
}

export default function ProfessorStudentsPreview({
  students,
  loading,
  tutorId,
}: ProfessorStudentsPreviewProps) {
  return (
    <section id="alunos" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Meus alunos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alunos com aulas confirmadas ou concluídas com você.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-lg font-semibold text-foreground">Você ainda não tem alunos.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando uma aula for confirmada, o aluno aparecerá aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {students.map((student) => (
            <li
              key={student.studentId}
              className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{student.displayName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.subject} · {student.lessonCount}{" "}
                    {student.lessonCount === 1 ? "aula" : "aulas"}
                  </p>
                  {student.upcomingLessonLabel ? (
                    <p className="mt-1 text-sm text-foreground">
                      Próxima aula: {student.upcomingLessonLabel}
                    </p>
                  ) : null}
                  {student.lastLessonLabel ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Última aula: {student.lastLessonLabel}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/mensagens/${encodeURIComponent(conversationIdFor(student.studentId, tutorId))}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Enviar mensagem
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
