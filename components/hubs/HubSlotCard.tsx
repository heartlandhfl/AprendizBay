"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin, Monitor } from "lucide-react";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { formatHubPrice, formatVacancyLabel } from "@/lib/hubs/service";
import { collectiveSavingsPercent } from "@/lib/hubs/public";

interface HubSlotCardProps {
  hub: CollectiveHubLive;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  joinSlot?: ReactNode;
  href?: string;
}

export default function HubSlotCard({
  hub,
  selected = false,
  onSelect,
  selectable = false,
  joinSlot,
  href,
}: HubSlotCardProps) {
  const spotsLeft = Math.max(0, hub.maxStudents - hub.confirmedStudents);
  const progressPercent =
    hub.maxStudents > 0 ? (hub.confirmedStudents / hub.maxStudents) * 100 : 0;
  const isFull = hub.confirmedStudents >= hub.maxStudents || hub.status === "full";
  const savings = collectiveSavingsPercent(
    hub.individualPrice ?? 0,
    hub.currentPrice,
  );

  const containerClass = selectable
    ? `w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "border-secondary-400 bg-secondary-50 ring-2 ring-secondary-200"
          : "border-border bg-muted/30 hover:border-secondary-300 hover:bg-secondary-50/50"
      }`
    : "w-full rounded-2xl border border-border bg-muted/30 p-4 text-left";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          {hub.subject ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              {hub.subject}
            </p>
          ) : null}
          <h4 className="font-semibold text-foreground">{hub.title}</h4>
          {hub.tutorName ? (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              Professor: {hub.tutorName}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{hub.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-bold text-white">
          {formatHubPrice(hub.currentPrice)}/h
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-secondary-700">
        {formatVacancyLabel(hub.confirmedStudents, hub.maxStudents)}
      </p>
      <p className="mt-1 text-sm text-foreground">
        Preço por aluno:{" "}
        <span className="font-bold text-primary-600">
          {formatHubPrice(hub.currentPrice)}/h
        </span>
        {savings > 0 ? (
          <>
            {" "}
            · Economia de {savings}% versus aula individual
            {hub.individualPrice
              ? ` (${formatHubPrice(hub.individualPrice)}/h)`
              : ""}
          </>
        ) : (
          <>
            . O preço cai para{" "}
            <span className="font-bold text-primary-600">
              {formatHubPrice(hub.fullPrice)}/h
            </span>{" "}
            se a turma lotar.
          </>
        )}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{isFull ? "Turma completa" : `${spotsLeft} vaga${spotsLeft !== 1 ? "s" : ""}`}</span>
          <span>{Math.round(progressPercent)}% preenchido</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary-400 to-secondary-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={hub.confirmedStudents}
            aria-valuemin={0}
            aria-valuemax={hub.maxStudents}
            aria-label={formatVacancyLabel(hub.confirmedStudents, hub.maxStudents)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {hub.modality === "online" ? (
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{hub.modality === "online" ? "Online" : "Presencial"}</span>
        {hub.scheduledDate ? <span>{formatHubDate(hub.scheduledDate)}</span> : null}
        {hub.startTime ? <span>{hub.startTime}</span> : null}
        <span>{hub.schedule}</span>
      </div>

      {href && !selectable ? (
        <Link
          href={href}
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-secondary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-600"
        >
          Ver turma
        </Link>
      ) : null}

      {joinSlot && <div className="mt-4">{joinSlot}</div>}
    </>
  );

  if (selectable && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={containerClass}
        aria-pressed={selected}
        disabled={isFull && !selected}
      >
        {content}
      </button>
    );
  }

  return <article className={containerClass}>{content}</article>;
}

function formatHubDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
