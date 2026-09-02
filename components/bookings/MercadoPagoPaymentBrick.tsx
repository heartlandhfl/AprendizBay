"use client";

import { useEffect, useRef, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

interface MercadoPagoPaymentBrickProps {
  bookingId: string;
  amount: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

let mercadoPagoInitialized = false;

function ensureMercadoPagoInitialized(publicKey: string): boolean {
  if (!publicKey) {
    return false;
  }
  if (!mercadoPagoInitialized) {
    initMercadoPago(publicKey, { locale: "pt-BR" });
    mercadoPagoInitialized = true;
  }
  return true;
}

export default function MercadoPagoPaymentBrick({
  bookingId,
  amount,
  onSuccess,
  onError,
}: MercadoPagoPaymentBrickProps) {
  const { user, userDoc } = useAuth();
  const [publicKey, setPublicKey] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/public-config");
        const payload = (await response.json().catch(() => null)) as
          | { mercadopagoPublicKey?: string }
          | null;
        if (!cancelled) {
          setPublicKey(payload?.mercadopagoPublicKey?.trim() ?? "");
        }
      } catch {
        if (!cancelled) {
          setPublicKey("");
        }
      } finally {
        if (!cancelled) {
          setLoadingConfig(false);
        }
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingConfig) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando pagamento...
      </div>
    );
  }

  if (!ensureMercadoPagoInitialized(publicKey)) {
    return (
      <p className="text-sm text-red-700" role="alert">
        A configuração de pagamento não está disponível.
      </p>
    );
  }

  return (
    <Payment
      initialization={{
        amount,
        payer: {
          email: userDoc?.email || user?.email || "",
        },
      }}
      customization={{
        paymentMethods: {
          creditCard: "all",
          debitCard: "all",
          ticket: "all",
          bankTransfer: "all",
        },
      }}
      onSubmit={async ({ formData }) => {
        if (submittingRef.current) {
          return;
        }
        if (!user) {
          onError("Faça login para pagar esta aula.");
          return;
        }

        submittingRef.current = true;

        try {
          const idToken = await user.getIdToken();
          const response = await fetch("/api/mercadopago/process-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              bookingId,
              token: formData.token,
              paymentMethodId: formData.payment_method_id,
              installments: formData.installments,
              issuerId: formData.issuer_id,
              payer: formData.payer,
            }),
          });

          const payload = (await response.json().catch(() => null)) as
            | { status?: string; statusDetail?: string; error?: string }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || "Não foi possível processar o pagamento.");
          }

          if (payload?.status === "approved") {
            onSuccess(
              "Pagamento enviado. A confirmação final chegará em instantes pelo Mercado Pago.",
            );
            return;
          }

          if (payload?.status === "pending" || payload?.status === "in_process") {
            onSuccess(
              "Pagamento pendente. Assim que o Mercado Pago confirmar, sua aula será liberada.",
            );
            return;
          }

          if (payload?.status === "rejected") {
            throw new Error("O pagamento foi recusado. Tente novamente com outro método.");
          }

          onSuccess(
            "Pagamento registrado. Aguarde a confirmação do Mercado Pago para liberar a aula.",
          );
        } catch (payError) {
          onError(
            payError instanceof Error
              ? payError.message
              : "Não foi possível processar o pagamento.",
          );
        } finally {
          submittingRef.current = false;
        }
      }}
      onError={() => {
        onError("Não foi possível carregar o formulário de pagamento.");
      }}
    />
  );
}
