"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import RequireAuth from "@/components/auth/RequireAuth";
import { fetchFacilitatorDashboard } from "@/lib/facilitators/client";

interface DashboardState {
  referralCode: string;
  referralLink: string;
  displayName: string;
  clicks: number;
  signups: number;
  activeUsers: number;
  paidBookings: number;
  commissionTotals: Record<string, number>;
  commissionAmounts: Record<string, number>;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function FacilitatorDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacilitatorDashboard();
      setDashboard(data as unknown as DashboardState);
    } catch (caught) {
      setDashboard(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function copyReferralLink() {
    if (!dashboard?.referralLink) {
      return;
    }
    await navigator.clipboard.writeText(dashboard.referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Suspense fallback={null}>
      <RequireAuth>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel do facilitador</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe cliques, cadastros e comissões das suas indicações.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {!loading && dashboard && (
          <div className="space-y-8">
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-foreground">Seu link de indicação</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Compartilhe este link para convidar novos alunos para a Aprendiz Bay.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={dashboard.referralLink}
                  className="h-11 flex-1 rounded-2xl border border-border bg-muted/40 px-4 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void copyReferralLink()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "Copiado!" : "Copiar link"}
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Código: <strong>{dashboard.referralCode}</strong>
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Cliques no link" value={dashboard.clicks} />
              <MetricCard label="Cadastros" value={dashboard.signups} />
              <MetricCard label="Usuários ativos" value={dashboard.activeUsers} />
              <MetricCard label="Primeiras aulas pagas" value={dashboard.paidBookings} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Comissão pendente"
                value={formatMoney(dashboard.commissionAmounts.pending ?? 0)}
              />
              <MetricCard
                label="Comissão disponível"
                value={formatMoney(dashboard.commissionAmounts.available ?? 0)}
              />
              <MetricCard
                label="Comissão paga"
                value={formatMoney(dashboard.commissionAmounts.paid ?? 0)}
              />
            </section>
          </div>
        )}
      </div>
      </RequireAuth>
    </Suspense>
  );
}
