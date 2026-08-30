"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatBookingPrice } from "@/lib/bookings/service";
import { formatCpf, isValidCpf } from "@/lib/payments/cpf";

interface PayBookingFormProps {
  bookingId: string;
  price: number;
}

export default function PayBookingForm({ bookingId, price }: PayBookingFormProps) {
  const { user } = useAuth();
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError("Faça login para pagar esta aula.");
      return;
    }

    if (!isValidCpf(cpf)) {
      setError("Informe um CPF válido para continuar.");
      return;
    }

    setSubmitting(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ bookingId, cpf }),
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
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="mt-4 space-y-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          O professor confirmou. Pague {formatBookingPrice(price)} para liberar a aula.
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          O Asaas exige o CPF do aluno para Pix ou cartão de crédito.
        </p>
      </div>

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

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abrindo pagamento...
          </>
        ) : (
          "Pagar com Pix ou cartão"
        )}
      </button>
    </form>
  );
}
