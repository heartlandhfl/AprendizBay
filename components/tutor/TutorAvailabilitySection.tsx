"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/availability/constants";
import { subscribeToTutorAvailability } from "@/lib/availability/service";
import type { AvailabilitySlot, Weekday } from "@/lib/availability/types";

interface TutorAvailabilitySectionProps {
  tutorId: string;
}

export default function TutorAvailabilitySection({ tutorId }: TutorAvailabilitySectionProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    return subscribeToTutorAvailability(
      tutorId,
      (availability) => {
        setSlots(availability.slots);
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar a disponibilidade.");
        setLoading(false);
      },
    );
  }, [tutorId]);

  const grouped = useMemo(() => {
    const byDay = new Map<Weekday, AvailabilitySlot[]>();
    for (const slot of slots) {
      const daySlots = byDay.get(slot.weekday) ?? [];
      daySlots.push(slot);
      byDay.set(slot.weekday, daySlots);
    }
    return byDay;
  }, [slots]);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">Disponibilidade</h2>

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
          Carregando horários...
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && slots.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-muted/40 px-4 py-8 text-center">
          <Calendar className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            Este professor ainda não cadastrou horários de disponibilidade.
          </p>
        </div>
      ) : null}

      {!loading && !error && slots.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {WEEKDAYS.filter((weekday) => grouped.has(weekday)).map((weekday) => (
            <li
              key={weekday}
              className="flex flex-col gap-2 rounded-2xl bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-semibold text-foreground">
                {WEEKDAY_LABELS[weekday]}
              </span>
              <span className="text-sm text-muted-foreground">
                {grouped
                  .get(weekday)!
                  .map((slot) => `${slot.startTime}–${slot.endTime}`)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
