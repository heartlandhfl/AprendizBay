"use client";

import { X } from "lucide-react";
import type { Booking } from "@/lib/bookings/types";
import {
  describeCancellation,
  type CancelActor,
} from "@/lib/bookings/cancellation";
import { formatBookingPrice } from "@/lib/bookings/service";

interface CancelBookingDialogProps {
  booking: Booking;
  actor: CancelActor;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelBookingDialog({
  booking,
  actor,
  submitting = false,
  error,
  onClose,
  onConfirm,
}: CancelBookingDialogProps) {
  const { decision, copy } = describeCancellation(
    booking,
    actor,
    formatBookingPrice(booking.price),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="cancel-booking-title" className="text-xl font-bold text-foreground">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            decision.willRefund
              ? "bg-primary-50 text-primary-800"
              : decision.reason === "late_student"
                ? "bg-amber-50 text-amber-950"
                : "bg-muted text-foreground"
          }`}
        >
          <p className="font-semibold">O que acontece com o valor pago</p>
          <p className="mt-1">{copy.amountNote}</p>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            Voltar
          </button>
          {decision.canCancel && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Cancelando..." : copy.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
