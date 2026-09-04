"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import CreateHubForm from "@/components/hubs/CreateHubForm";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { formatHubDateTime, hubStatusLabel } from "@/lib/tutors/upcoming-lessons";

interface ProfessorHubsSectionProps {
  hubs: CollectiveHubLive[];
  loading: boolean;
}

export default function ProfessorHubsSection({ hubs, loading }: ProfessorHubsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section id="turmas" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Minhas turmas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensine em grupo: publique uma turma coletiva e acompanhe vagas, horário e status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Criar nova turma
          </button>
          <a
            href="#turmas-lista"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver minhas turmas
          </a>
        </div>
      </div>

      {showForm ? <CreateHubForm /> : null}

      <div id="turmas-lista" className="scroll-mt-24">
        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
            <span className="sr-only">Carregando turmas...</span>
          </div>
        ) : hubs.length === 0 ? (
          <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
            <p className="text-lg font-semibold text-foreground">
              Crie sua primeira turma e comece a ensinar em grupo.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Turmas coletivas são um diferencial da Aprendiz Bay: vários alunos, um único horário.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hubs.map((hub) => (
              <article
                key={hub.id}
                className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {hub.subject ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                        {hub.subject}
                      </p>
                    ) : null}
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{hub.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatHubDateTime(hub)}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {hubStatusLabel(hub.status)}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Modalidade</dt>
                    <dd className="font-medium text-foreground">
                      {hub.modality === "presencial" ? "Presencial" : "Online"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vagas</dt>
                    <dd className="font-medium text-foreground">
                      {hub.confirmedStudents} de {hub.maxStudents}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Horário</dt>
                    <dd className="font-medium text-foreground">{hub.startTime || hub.schedule}</dd>
                  </div>
                </dl>

                <Link
                  href={`/turmas/${hub.id}`}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Ver turma
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
