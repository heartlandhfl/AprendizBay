"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import BookingStatusBadge from "@/components/bookings/BookingStatusBadge";
import CancelBookingDialog from "@/components/bookings/CancelBookingDialog";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import PayBookingForm from "@/components/bookings/PayBookingForm";
import PaymentStatusBadge from "@/components/bookings/PaymentStatusBadge";
import ReviewModal from "@/components/reviews/ReviewModal";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking, PaymentStatus } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import {
  decideCancellation,
  getCancellationCopy,
  toScheduledDate,
} from "@/lib/bookings/cancellation";
import {
  cancelBookingAsStudent,
  fetchTutorName,
  formatBookingDate,
  formatBookingPrice,
  subscribeToStudentBookings,
} from "@/lib/bookings/service";
import { subscribeToStudentReviewBookingIds } from "@/lib/reviews/client";

interface EnrichedBooking extends Booking {
  tutorName: string;
}

interface ReviewTarget {
  bookingId: string;
  tutorId: string;
  tutorName: string;
}

const PAYMENT_RETURN_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento enviado. Assim que o Asaas confirmar, sua aula será liberada.",
  cancelado: "O pagamento foi cancelado. Você pode tentar novamente quando quiser.",
  expirado: "O link de pagamento expirou. Gere um novo checkout para continuar.",
};

export default function StudentBookingsList() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const paymentReturn = searchParams.get("pagamento");
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EnrichedBooking | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeBookings = subscribeToStudentBookings(
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

    const unsubscribeReviews = subscribeToStudentReviewBookingIds(
      user.uid,
      setReviewedBookingIds,
    );

    return () => {
      unsubscribeBookings();
      unsubscribeReviews();
    };
  }, [user]);

  async function handleCancelConfirm() {
    if (!cancelTarget) {
      return;
    }

    setActionId(cancelTarget.id);
    setError(null);

    try {
      await cancelBookingAsStudent(cancelTarget.id);
      setCancelTarget(null);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Não foi possível cancelar a reserva.",
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Minhas aulas</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe suas reservas, pague após a confirmação do professor e cancele quando necessário.
        </p>
      </div>

      {paymentReturn && PAYMENT_RETURN_MESSAGES[paymentReturn] && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            paymentReturn === "sucesso"
              ? "bg-primary-50 text-primary-800"
              : "bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          {PAYMENT_RETURN_MESSAGES[paymentReturn]}
        </p>
      )}

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
            const paymentStatus: PaymentStatus = booking.paymentStatus ?? "unpaid";
            const canPay =
              booking.status === "pending" && paymentStatus === "awaiting_payment";
            const cancellation = decideCancellation({
              status: booking.status,
              paymentStatus,
              scheduledAt: toScheduledDate(booking.scheduledAt),
              actor: "student",
            });
            const cancellationCopy = getCancellationCopy(
              cancellation,
              formatBookingPrice(booking.price),
            );
            const showCancel =
              booking.status === "pending" || booking.status === "confirmed";
            const canReview =
              booking.status === "completed" && !reviewedBookingIds.has(booking.id);

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
                  <div className="flex flex-wrap gap-2">
                    <BookingStatusBadge status={booking.status} />
                    <PaymentStatusBadge status={paymentStatus} />
                  </div>
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

                {booking.status === "pending" && paymentStatus === "unpaid" && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Aguardando o professor confirmar. Depois você poderá pagar para liberar a aula.
                  </p>
                )}

                {canPay && (
                  <PayBookingForm
                    bookingId={booking.id}
                    price={booking.price}
                    platformFee={booking.platformFee}
                    tutorAmount={booking.tutorAmount}
                  />
                )}

                {booking.status === "confirmed" && booking.meetingUrl && (
                  <div className="mt-4">
                    <JoinLessonButton meetingUrl={booking.meetingUrl} />
                  </div>
                )}

                {canReview && user && (
                  <button
                    type="button"
                    onClick={() =>
                      setReviewTarget({
                        bookingId: booking.id,
                        tutorId: booking.tutorId,
                        tutorName: booking.tutorName,
                      })
                    }
                    className="mt-4 rounded-2xl bg-secondary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-600"
                  >
                    Deixar avaliação
                  </button>
                )}

                {showCancel && paymentStatus === "paid" && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {cancellationCopy.amountNote}
                  </p>
                )}

                {showCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCancelTarget(booking);
                    }}
                    disabled={actionId === booking.id}
                    className="mt-4 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    {cancellation.canCancel ? "Cancelar reserva" : "Ver política de cancelamento"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <CancelBookingDialog
          booking={cancelTarget}
          actor="student"
          submitting={actionId === cancelTarget.id}
          error={error}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {reviewTarget && user && (
        <ReviewModal
          bookingId={reviewTarget.bookingId}
          tutorId={reviewTarget.tutorId}
          studentId={user.uid}
          tutorName={reviewTarget.tutorName}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
