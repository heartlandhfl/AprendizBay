"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import {
  buildBookableSlots,
  formatSlotTime,
  groupBookableSlotsByDay,
  isSameSlot,
} from "@/lib/availability/slots";
import { subscribeToTutorAvailability } from "@/lib/availability/service";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { subscribeToTutorOccupiedBookings } from "@/lib/bookings/service";

interface IndividualSlotPickerProps {
  tutorId: string;
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date | null) => void;
}

export default function IndividualSlotPicker({
  tutorId,
  selectedSlot,
  onSelectSlot,
}: IndividualSlotPickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [occupiedStarts, setOccupiedStarts] = useState<Date[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [occupiedLoaded, setOccupiedLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAvailabilityLoaded(false);
    setOccupiedLoaded(false);
    onSelectSlot(null);

    const unsubscribeAvailability = subscribeToTutorAvailability(
      tutorId,
      (availability) => {
        setAvailabilitySlots(availability.slots);
        setAvailabilityLoaded(true);
      },
      () => {
        setError("Não foi possível carregar a disponibilidade do professor.");
        setAvailabilityLoaded(true);
      },
    );

    const unsubscribeOccupied = subscribeToTutorOccupiedBookings(
      tutorId,
      (bookings) => {
        setOccupiedStarts(bookings.map((booking) => booking.scheduledAt.toDate()));
        setOccupiedLoaded(true);
      },
      () => {
        setError("Não foi possível verificar horários já reservados.");
        setOccupiedLoaded(true);
      },
    );

    return () => {
      unsubscribeAvailability();
      unsubscribeOccupied();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset selection when tutor changes
  }, [tutorId]);

  useEffect(() => {
    if (!availabilityLoaded || !occupiedLoaded) {
      return;
    }

    setLoading(false);
  }, [availabilityLoaded, occupiedLoaded]);

  const bookableSlots = useMemo(
    () => buildBookableSlots(availabilitySlots, occupiedStarts),
    [availabilitySlots, occupiedStarts],
  );

  const groupedSlots = useMemo(
    () => groupBookableSlotsByDay(bookableSlots),
    [bookableSlots],
  );

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    const stillAvailable = bookableSlots.some((slot) =>
      isSameSlot(slot.startsAt, selectedSlot),
    );

    if (!stillAvailable) {
      onSelectSlot(null);
    }
  }, [bookableSlots, onSelectSlot, selectedSlot]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando horários disponíveis...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (bookableSlots.length === 0) {
    return (
      <div className="rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
        Este professor ainda não possui horários livres para aulas individuais.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        Selecione um horário disponível
      </div>

      <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
        {groupedSlots.map((group) => (
          <section key={group.dayKey}>
            <h4 className="mb-2 text-sm font-semibold capitalize text-foreground">
              {group.label}
            </h4>
            <div className="flex flex-wrap gap-2">
              {group.slots.map((slot) => {
                const isSelected = isSameSlot(selectedSlot, slot.startsAt);

                return (
                  <button
                    key={slot.startsAt.toISOString()}
                    type="button"
                    onClick={() => onSelectSlot(slot.startsAt)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-primary-600 text-white shadow-card"
                        : "bg-surface text-foreground ring-1 ring-border hover:bg-primary-50 hover:ring-primary-200"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {formatSlotTime(slot.startsAt)}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedSlot && (
        <p className="text-sm text-muted-foreground">
          Horário selecionado:{" "}
          <span className="font-medium text-foreground">
            {selectedSlot.toLocaleString("pt-BR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </span>
        </p>
      )}
    </div>
  );
}
