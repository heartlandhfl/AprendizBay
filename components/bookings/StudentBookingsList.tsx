"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BookingStatusBadge from "@/components/bookings/BookingStatusBadge";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import {
  cancelBookingAsStudent,
  fetchTutorName,
  formatBookingDate,
  formatBookingPrice,
  subscribeToStudentBookings,
} from "@/lib/bookings/service";

interface EnrichedBooking extends Booking {
  tutorName: string;
}

export default function StudentBookingsList() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToStudentBookings(
      user.uid,
      async (nextBookings) => {
        const enriched = await Promise.all(
          nextBookings.map(async (booking) => ({
            ...booking,
            tutorName: await fetchTutorName(booking.tutorId),
          })),
        );

        setBookings(enriched);
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar suas reservas.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  async function handleCancel(bookingId: string) {
    setActionId(bookingId);
    setError(null);

    try {
      await cancelBookingAsStudent(bookingId);
    } catch {
      setError("Não foi possível cancelar a reserva.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Minhas aulas</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe suas reservas e cancele quando necessário.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-lg font-semibold text-foreground">Nenhuma reserva ainda</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Encontre um professor e reserve sua primeira aula.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const canCancel =
              booking.status === "pending" || booking.status === "confirmed";

            return (
              <article
                key={booking.id}
                className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {booking.tutorName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {BOOKING_TYPE_LABELS[booking.type]}
                      {booking.hubId ? ` · Turma ${booking.hubId}` : ""}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Data agendada</dt>
                    <dd className="font-medium text-foreground">
                      {formatBookingDate(booking.scheduledAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd className="font-medium text-foreground">
                      {formatBookingPrice(booking.price)}/h
                    </dd>
                  </div>
                </dl>

                {booking.status === "confirmed" && booking.meetingUrl && (
                  <div className="mt-4">
                    <JoinLessonButton meetingUrl={booking.meetingUrl} />
                  </div>
                )}

                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id)}
                    disabled={actionId === booking.id}
                    className="mt-4 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    {actionId === booking.id ? "Cancelando..." : "Cancelar reserva"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
