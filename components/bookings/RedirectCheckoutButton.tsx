"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

interface RedirectCheckoutButtonProps {
  bookingId: string;
  label?: string;
  onError: (message: string) => void;
}

export default function RedirectCheckoutButton({
  bookingId,
  label = "Pagar com Pix ou cartão",
  onError,
}: RedirectCheckoutButtonProps) {
  const { user, userDoc } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!user || loading) {
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          email: userDoc?.email ?? user.email ?? "",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.checkoutUrl) {
        onError(payload?.error ?? "Não foi possível iniciar o pagamento.");
        setLoading(false);
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      onError("Não foi possível iniciar o pagamento.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCheckout()}
      disabled={loading || !user}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {loading ? "Gerando checkout..." : label}
    </button>
  );
}
