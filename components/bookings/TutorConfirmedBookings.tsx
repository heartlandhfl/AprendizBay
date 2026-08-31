"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BookingStatusBadge from "@/components/bookings/BookingStatusBadge";
import CancelBookingDialog from "@/components/bookings/CancelBookingDialog";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import {
  decideCancellation,
  getCancellationCopy,
  toScheduledDate,
} from "@/lib/bookings/cancellation";
import {
  cancelBookingAsTutor,
  fetchUserDisplayName,
  formatBookingDate,
  formatBookingPrice,
  hasScheduledTimePassed,
  markBookingCompleted,
  subscribeToTutorConfirmedBookings,
} from "@/lib/bookings/service";
import { isLessonUnlocked } from "@/lib/payments/status";

interface EnrichedBooking extends Booking {
  studentName: string;
}

export default function TutorConfirmedBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EnrichedBooking | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorConfirmedBookings(
      user.uid,
      async (nextBookings) => {
        const enriched = await Promise.all(
          nextBookings.map(async (booking) => ({
            ...booking,
            studentName: await fetchUserDisplayName(booking.studentId),
          })),
        );

        setBookings(enriched);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleCancelConfirm() {
    if (!cancelTarget) {
      return;
    }

    setActionId(cancelTarget.id);
    setError(null);

    try {
      await cancelBookingAsTutor(cancelTarget.id);
      setCancelTarget(null);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Não foi possível cancelar a aula.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleComplete(bookingId: string) {
    setActionId(bookingId);
    setError(null);

    try {
      await markBookingCompleted(bookingId);
    } catch {
      setError("Não foi possível marcar a aula como concluída.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return null;
  }

  if (bookings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Aulas confirmadas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre na sala de videoconferência quando for hora da aula e marque como concluída
          depois do horário agendado.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const canComplete = hasScheduledTimePassed(booking.scheduledAt, now);
          const cancellation = decideCancellation({
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            scheduledAt: toScheduledDate(booking.scheduledAt),
            actor: "tutor",
          });
          const cancellationCopy = getCancellationCopy(
            cancellation,
            formatBookingPrice(booking.price),
          );

          return (
            <article
              key={booking.id}
              className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {booking.studentName}
                  </h3>
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

              {booking.paymentStatus === "paid" && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {cancellationCopy.amountNote}
                </p>
              )}

              {isLessonUnlocked(booking) && (
                <div className="mt-4">
                  <JoinLessonButton meetingUrl={booking.meetingUrl!} />
                </div>
              )}

              {cancellation.canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCancelTarget(booking);
                  }}
                  disabled={actionId === booking.id}
                  className="mt-4 mr-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  Cancelar aula
                </button>
              )}

              <button
                type="button"
                onClick={() => handleComplete(booking.id)}
                disabled={!canComplete || actionId === booking.id}
                className="mt-4 inline-flex items-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionId === booking.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Concluindo...
                  </>
                ) : (
                  "Marcar aula como concluída"
                )}
              </button>

              {!canComplete && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Disponível após o horário agendado.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {cancelTarget && (
        <CancelBookingDialog
          booking={cancelTarget}
          actor="tutor"
          submitting={actionId === cancelTarget.id}
          error={error}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelConfirm}
        />
      )}
    </section>
  );
}
