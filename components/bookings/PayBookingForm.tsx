"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import BookingPaymentSummary from "@/components/bookings/BookingPaymentSummary";
import RedirectCheckoutButton from "@/components/bookings/RedirectCheckoutButton";
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

type PaymentProvider = "asaas" | "mercadopago" | "infinitepay";

interface PayBookingFormProps {
  bookingId: string;
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  headline?: string;
  description?: string;
  actionLabel?: string;
}

function usesRedirectCheckout(provider: PaymentProvider): boolean {
  return provider === "infinitepay" || provider === "asaas";
}

export default function PayBookingForm({
  bookingId,
  price,
  platformFee,
  tutorAmount,
  headline,
  description,
  actionLabel,
}: PayBookingFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("mercadopago");

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/public-config");
        const payload = (await response.json().catch(() => null)) as
          | { paymentProvider?: PaymentProvider }
          | null;
        if (!cancelled) {
          const provider = payload?.paymentProvider;
          if (provider === "asaas" || provider === "mercadopago" || provider === "infinitepay") {
            setPaymentProvider(provider);
          }
        }
      } catch {
        if (!cancelled) {
          setPaymentProvider("mercadopago");
        }
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const redirectCheckout = usesRedirectCheckout(paymentProvider);

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          {headline ?? `O professor confirmou. Pague ${formatBookingPrice(price)} para liberar a aula.`}
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          {description ??
            "Confira quanto vai para o professor e quanto é a taxa da plataforma antes de pagar. A aula só será liberada depois da confirmação do pagamento."}
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

      {!success &&
        (redirectCheckout ? (
          <RedirectCheckoutButton
            bookingId={bookingId}
            label={actionLabel ?? "Pagar com Pix ou cartão"}
            onError={(message) => {
              setSuccess(null);
              setError(message);
            }}
          />
        ) : (
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
        ))}
    </div>
  );
}
