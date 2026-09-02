"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import {
  approveFacilitatorPayout,
  fetchAvailableFacilitatorCommissions,
  fetchPendingFacilitatorPayouts,
  markFacilitatorPayoutAsPaid,
} from "@/lib/admin/facilitator-payouts-client";
import { formatAdminDate } from "@/lib/admin/format";

interface AvailableSummary {
  facilitatorId: string;
  facilitatorName: string | null;
  count: number;
  amount: number;
}

interface FacilitatorPayoutItem {
  payoutId: string;
  facilitatorId: string;
  facilitatorName: string | null;
  commissionIds: string[];
  amount: number;
  status: string;
  createdAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FacilitatorPayoutsAdmin() {
  const [available, setAvailable] = useState<AvailableSummary[]>([]);
  const [payouts, setPayouts] = useState<FacilitatorPayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<FacilitatorPayoutItem | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaries, approvedPayouts] = await Promise.all([
        fetchAvailableFacilitatorCommissions(),
        fetchPendingFacilitatorPayouts(),
      ]);
      setAvailable(summaries as AvailableSummary[]);
      setPayouts(approvedPayouts as FacilitatorPayoutItem[]);
    } catch (caught) {
      setAvailable([]);
      setPayouts([]);
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os repasses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleApprove(facilitatorId: string) {
    setApprovingId(facilitatorId);
    setActionError(null);
    try {
      await approveFacilitatorPayout(facilitatorId);
      await loadData();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Não foi possível aprovar o repasse.",
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function confirmMarkPaid() {
    if (!selectedPayout) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await markFacilitatorPayoutAsPaid(selectedPayout.payoutId);
      setSelectedPayout(null);
      await loadData();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Não foi possível marcar o repasse como pago.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && available.length === 0 && payouts.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Comissões disponíveis</h2>
            <p className="text-sm text-muted-foreground">
              Aprove repasses para facilitadores com comissões liberadas após o prazo de reembolso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar
          </button>
        </div>

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {actionError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {actionError}
          </p>
        )}

        {available.length === 0 ? (
          <p className="rounded-2xl bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
            Nenhuma comissão disponível no momento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Facilitador</th>
                  <th className="px-4 py-3 font-medium">Comissões</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {available.map((item) => (
                  <tr key={item.facilitatorId} className="border-t border-border">
                    <td className="px-4 py-3">{item.facilitatorName ?? item.facilitatorId}</td>
                    <td className="px-4 py-3">{item.count}</td>
                    <td className="px-4 py-3">{formatMoney(item.amount)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={approvingId === item.facilitatorId}
                        onClick={() => void handleApprove(item.facilitatorId)}
                        className="rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        {approvingId === item.facilitatorId ? "Aprovando..." : "Aprovar repasse"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Repasses aprovados</h2>
        {payouts.length === 0 ? (
          <p className="rounded-2xl bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
            Nenhum repasse aprovado aguardando pagamento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Facilitador</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Aprovado em</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.payoutId} className="border-t border-border">
                    <td className="px-4 py-3">{payout.facilitatorName ?? payout.facilitatorId}</td>
                    <td className="px-4 py-3">{formatMoney(payout.amount)}</td>
                    <td className="px-4 py-3">{formatAdminDate(payout.approvedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPayout(payout)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Marcar como pago
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPayout && (
        <ConfirmActionDialog
          title="Confirmar pagamento ao facilitador"
          description={`Confirma que o repasse de ${formatMoney(selectedPayout.amount)} para ${
            selectedPayout.facilitatorName ?? "o facilitador"
          } foi realizado manualmente?`}
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
