"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BookingPaymentSummary from "@/components/bookings/BookingPaymentSummary";
import BookingStatusBadge from "@/components/bookings/BookingStatusBadge";
import CancelBookingDialog from "@/components/bookings/CancelBookingDialog";
import PaymentStatusBadge from "@/components/bookings/PaymentStatusBadge";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking, PaymentStatus } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import {
  cancelBookingAsTutor,
  confirmBookingAsTutor,
  fetchUserDisplayName,
  formatBookingDate,
  formatBookingPrice,
  subscribeToTutorPendingBookings,
} from "@/lib/bookings/service";
import {
  getPaymentLifecycle,
  getTutorPaymentCopy,
  hasTutorRequestedPayment,
} from "@/lib/payments/status";

interface EnrichedBooking extends Booking {
  studentName: string;
}

export default function TutorDashboardBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EnrichedBooking | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorPendingBookings(
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
      () => {
        setError("Não foi possível carregar as reservas pendentes.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  async function handleConfirm(bookingId: string) {
    setActionId(bookingId);
    setError(null);

    try {
      await confirmBookingAsTutor(bookingId);
    } catch {
      setError("Não foi possível confirmar a reserva.");
    } finally {
      setActionId(null);
    }
  }

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
          : "Não foi possível recusar a reserva.",
      );
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu painel</h1>
        <p className="mt-2 text-muted-foreground">
          Aceite solicitações para liberar o pagamento. A aula só é confirmada depois que o aluno pagar.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-lg font-semibold text-foreground">Nenhuma reserva pendente</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando um aluno reservar uma aula, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const paymentStatus: PaymentStatus = booking.paymentStatus ?? "unpaid";
            const lifecycle = getPaymentLifecycle(booking);
            const tutorCopy = getTutorPaymentCopy(lifecycle);
            const paymentRequested = hasTutorRequestedPayment(paymentStatus);

            return (
            <article
              key={booking.id}
              className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {booking.studentName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {BOOKING_TYPE_LABELS[booking.type]}
                    {booking.hubId ? ` · Turma ${booking.hubId}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BookingStatusBadge status={booking.status} />
                  <PaymentStatusBadge status={paymentStatus} />
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Data solicitada</dt>
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

              <div className="mt-4">
                <BookingPaymentSummary
                  price={booking.price}
                  platformFee={booking.platformFee}
                  tutorAmount={booking.tutorAmount}
                  variant="tutor"
                />
              </div>

              {tutorCopy && (
                <p className={`mt-4 text-sm ${
                  lifecycle === "failed" || lifecycle === "expired"
                    ? "text-red-800"
                    : "text-amber-800"
                }`}>
                  {tutorCopy.explanation}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {!paymentRequested && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(booking.id)}
                    disabled={actionId === booking.id}
                    className="rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                  >
                    {actionId === booking.id ? "Confirmando..." : "Confirmar e solicitar pagamento"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCancelTarget(booking);
                  }}
                  disabled={actionId === booking.id}
                  className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Recusar
                </button>
              </div>
            </article>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
