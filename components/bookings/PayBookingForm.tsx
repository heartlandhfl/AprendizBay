"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import BookingPaymentSummary from "@/components/bookings/BookingPaymentSummary";
import { formatBookingPrice } from "@/lib/bookings/service";

const MercadoPagoPaymentBrick = dynamic(
  () => import("@/components/bookings/MercadoPagoPaymentBrick"),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-amber-900">Carregando formulário de pagamento...</p>
    ),
  },
);

interface PayBookingFormProps {
  bookingId: string;
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  headline?: string;
  description?: string;
  actionLabel?: string;
}

export default function PayBookingForm({
  bookingId,
  price,
  platformFee,
  tutorAmount,
  headline,
  description,
}: PayBookingFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          {headline ?? `O professor confirmou. Pague ${formatBookingPrice(price)} para liberar a aula.`}
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          {description ??
            "Confira quanto vai para o professor e quanto é a taxa da plataforma antes de pagar. A aula só será liberada depois da confirmação do Mercado Pago."}
        </p>
      </div>

      <BookingPaymentSummary
        price={price}
        platformFee={platformFee}
        tutorAmount={tutorAmount}
      />

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-primary-800" role="status">
          {success}
        </p>
      )}

      {!success && (
        <MercadoPagoPaymentBrick
          bookingId={bookingId}
          amount={price}
          onSuccess={(message) => {
            setError(null);
            setSuccess(message);
          }}
          onError={(message) => {
            setSuccess(null);
            setError(message);
          }}
        />
      )}
    </div>
  );
}
