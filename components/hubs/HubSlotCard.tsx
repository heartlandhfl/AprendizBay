"use client";

import type { ReactNode } from "react";
import { MapPin, Monitor } from "lucide-react";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { formatHubPrice } from "@/lib/hubs/service";

interface HubSlotCardProps {
  hub: CollectiveHubLive;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  joinSlot?: ReactNode;
}

export default function HubSlotCard({
  hub,
  selected = false,
  onSelect,
  selectable = false,
  joinSlot,
}: HubSlotCardProps) {
  const spotsLeft = hub.maxStudents - hub.confirmedStudents;
  const progressPercent = (hub.confirmedStudents / hub.maxStudents) * 100;
  const isFull = hub.confirmedStudents >= hub.maxStudents;

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
          <h4 className="font-semibold text-foreground">{hub.title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{hub.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-bold text-white">
          {formatHubPrice(hub.currentPrice)}/h
        </span>
      </div>

      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold text-secondary-700">
          {hub.confirmedStudents}/{hub.maxStudents} alunos confirmados.
        </span>{" "}
        O preço cai para{" "}
        <span className="font-bold text-primary-600">
          {formatHubPrice(hub.fullPrice)}/h
        </span>{" "}
        se a turma lotar!
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isFull
              ? "Turma completa"
              : `${spotsLeft} vaga${spotsLeft !== 1 ? "s" : ""} restante${spotsLeft !== 1 ? "s" : ""}`}
          </span>
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
            aria-label={`${hub.confirmedStudents} de ${hub.maxStudents} vagas preenchidas`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        {hub.modality === "online" ? (
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {hub.schedule}
      </div>

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
