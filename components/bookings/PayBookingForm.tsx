"use client";

import { FormEvent, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import BookingPaymentSummary from "@/components/bookings/BookingPaymentSummary";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatBookingPrice } from "@/lib/bookings/service";
import {
  digitsOnly,
  formatCpf,
  formatPostalCode,
  isValidCpf,
  isValidPhone,
  isValidPostalCode,
} from "@/lib/payments/cpf";

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
  actionLabel = "Pagar com Pix ou cartão",
}: PayBookingFormProps) {
  const { user, userDoc } = useAuth();
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [province, setProvince] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    setError(null);

    if (!user) {
      setError("Faça login para pagar esta aula.");
      return;
    }

    if (!isValidCpf(cpf)) {
      setError("Informe um CPF válido para continuar.");
      return;
    }

    if (!isValidPhone(phone) || !isValidPostalCode(postalCode) || !address.trim() || !addressNumber.trim() || !province.trim()) {
      setError("Preencha telefone, CEP e endereço para o Asaas gerar o checkout.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookingId,
          cpf,
          email: userDoc?.email || user.email,
          phone: digitsOnly(phone),
          postalCode: digitsOnly(postalCode),
          address: address.trim(),
          addressNumber: addressNumber.trim(),
          province: province.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || "Não foi possível abrir o checkout.");
      }

      window.location.assign(payload.checkoutUrl);
    } catch (payError) {
      setError(
        payError instanceof Error
          ? payError.message
          : "Não foi possível abrir o pagamento.",
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="mt-4 space-y-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          {headline ?? `O professor confirmou. Pague ${formatBookingPrice(price)} para liberar a aula.`}
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          {description ??
            "Confira quanto vai para o professor e quanto é a taxa da plataforma antes de pagar. O Asaas exige CPF e dados de cobrança do aluno para Pix ou cartão de crédito."}
        </p>
      </div>

      <BookingPaymentSummary
        price={price}
        platformFee={platformFee}
        tutorAmount={tutorAmount}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground" htmlFor={`cpf-${bookingId}`}>
          CPF
          <input
            id={`cpf-${bookingId}`}
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-foreground" htmlFor={`phone-${bookingId}`}>
          Telefone
          <input
            id={`phone-${bookingId}`}
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(event) => setPhone(digitsOnly(event.target.value).slice(0, 11))}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-foreground sm:col-span-2" htmlFor={`address-${bookingId}`}>
          Endereço
          <input
            id={`address-${bookingId}`}
            name="address"
            autoComplete="street-address"
            placeholder="Rua, avenida..."
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-foreground" htmlFor={`number-${bookingId}`}>
          Número
          <input
            id={`number-${bookingId}`}
            name="addressNumber"
            placeholder="150"
            value={addressNumber}
            onChange={(event) => setAddressNumber(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-foreground" htmlFor={`province-${bookingId}`}>
          Bairro
          <input
            id={`province-${bookingId}`}
            name="province"
            placeholder="Centro"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm font-medium text-foreground sm:col-span-2" htmlFor={`cep-${bookingId}`}>
          CEP
          <input
            id={`cep-${bookingId}`}
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={postalCode}
            onChange={(event) => setPostalCode(formatPostalCode(event.target.value))}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary-600/20 focus:ring-2"
            required
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abrindo pagamento...
          </>
        ) : (
          actionLabel
        )}
      </button>
    </form>
  );
}
