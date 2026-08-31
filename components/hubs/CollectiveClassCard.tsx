import Link from "next/link";
import { Calendar, Clock, MapPin, Monitor, Users } from "lucide-react";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { collectiveSavingsPercent, formatVacancyLabel } from "@/lib/hubs/public";
import { formatHubPrice } from "@/lib/hubs/service";

interface CollectiveClassCardProps {
  hub: CollectiveHubLive;
}

function formatDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function CollectiveClassCard({ hub }: CollectiveClassCardProps) {
  const savings = collectiveSavingsPercent(hub.individualPrice ?? 0, hub.currentPrice);
  const dateLabel = formatDate(hub.scheduledDate);
  const isFull = hub.confirmedStudents >= hub.maxStudents || hub.status === "full";

  return (
    <article className="group flex flex-col rounded-2xl bg-surface p-5 shadow-card ring-1 ring-secondary-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:ring-secondary-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-secondary-700">
            Aula coletiva
          </p>
          {hub.subject ? (
            <p className="mt-1 text-sm font-semibold text-primary-600">{hub.subject}</p>
          ) : null}
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{hub.title}</h3>
          {hub.tutorName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Professor: <span className="font-medium text-foreground">{hub.tutorName}</span>
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-secondary-500 px-2.5 py-1 text-xs font-bold text-white">
          {formatHubPrice(hub.currentPrice)}/aluno
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{hub.description}</p>

      <dl className="mt-4 grid gap-2 text-sm">
        {dateLabel ? (
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-secondary-600" aria-hidden="true" />
            <dt className="sr-only">Data</dt>
            <dd className="capitalize">{dateLabel}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          <dt className="sr-only">Horário</dt>
          <dd>{hub.startTime || hub.schedule}</dd>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          {hub.modality === "online" ? (
            <Monitor className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          )}
          <dt className="sr-only">Modalidade</dt>
          <dd>{hub.modality === "online" ? "Online" : "Presencial"}</dd>
        </div>
        <div className="flex items-center gap-2 font-medium text-secondary-800">
          <Users className="h-4 w-4" aria-hidden="true" />
          <dt className="sr-only">Vagas</dt>
          <dd>{formatVacancyLabel(hub.confirmedStudents, hub.maxStudents)}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-secondary-100 to-secondary-50 px-3 py-2.5 ring-1 ring-secondary-200/80">
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary-800">Preço por aluno</span>
          <span className="text-base font-bold text-secondary-700">
            {formatHubPrice(hub.currentPrice)}/h
          </span>
        </div>
        {savings > 0 ? (
          <span className="mt-1 inline-flex items-center rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-semibold text-white">
            Economia de {savings}% versus individual
            {hub.individualPrice ? ` (${formatHubPrice(hub.individualPrice)}/h)` : ""}
          </span>
        ) : null}
      </div>

      <Link
        href={`/turmas/${hub.id}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-secondary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-secondary-600 hover:shadow-soft-lg active:scale-[0.98]"
      >
        {isFull ? "Turma completa" : "Ver turma"}
      </Link>
    </article>
  );
}
