"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import type { AdminTutorPayoutListItem } from "@/lib/admin/tutor-payouts";
import {
  fetchPendingTutorPayouts,
  markTutorPayoutAsPaid,
} from "@/lib/admin/payouts-client";
import { formatAdminDate } from "@/lib/admin/format";

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PendingTutorPayoutsList() {
  const [payouts, setPayouts] = useState<AdminTutorPayoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<AdminTutorPayoutListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPayouts(await fetchPendingTutorPayouts());
    } catch (caught) {
      setPayouts([]);
      setError(
        caught instanceof Error ? caught.message : "Não foi possível carregar os repasses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  async function confirmMarkPaid() {
    if (!selectedPayout) {
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await markTutorPayoutAsPaid(selectedPayout.payoutId);
      setSelectedPayout(null);
      await loadPayouts();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Não foi possível marcar o repasse como pago.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && payouts.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando repasses pendentes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repasses a professores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Repasses liberados após a conclusão da aula. Marque manualmente como pago após
            transferir o valor ao professor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPayouts()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {actionError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {actionError}
        </p>
      )}

      {payouts.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum repasse pendente no momento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Professor</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Reserva</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Criado em</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {payouts.map((payout) => (
                <tr key={payout.payoutId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {payout.tutorName ?? "Professor"}
                    </div>
                    <div className="text-xs text-muted-foreground">{payout.tutorId}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {payout.bookingId}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatMoney(payout.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatAdminDate(payout.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setSelectedPayout(payout);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Marcar como pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayout && (
        <ConfirmActionDialog
          title="Confirmar repasse manual?"
          description={`Confirme que você transferiu ${formatMoney(selectedPayout.amount)} para ${
            selectedPayout.tutorName ?? "o professor"
          } referente à reserva ${selectedPayout.bookingId}.`}
          confirmLabel="Marcar como pago"
          confirmClassName="bg-primary-600 hover:bg-primary-700"
          reasonValue=""
          onReasonChange={() => undefined}
          submitting={submitting}
          error={actionError}
          onClose={() => {
            if (!submitting) {
              setSelectedPayout(null);
              setActionError(null);
            }
          }}
          onConfirm={() => void confirmMarkPaid()}
        />
      )}
    </div>
  );
}
