"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import { fetchAdminOperationsDashboard } from "@/lib/admin/client";
import type { AdminOperationsDashboard } from "@/lib/admin/dashboard";
import {
  formatAdminCount,
  formatAdminDate,
  formatAdminMoney,
  UNAVAILABLE_LABEL,
} from "@/lib/admin/format";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function OperationsDashboard() {
  const [dashboard, setDashboard] = useState<AdminOperationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDashboard(await fetchAdminOperationsDashboard());
    } catch (caught) {
      setDashboard(null);
      setError(
        caught instanceof Error ? caught.message : "Não foi possível carregar o painel.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading && !dashboard) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando painel operacional...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel operacional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Números reais do Firebase para operação diária. Métricas sem fonte
            confiável aparecem como {UNAVAILABLE_LABEL}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {dashboard ? (
        <>
          <Section
            id="visao-geral"
            title="Visão geral"
            description="Contagens operacionais da plataforma."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Total de alunos" value={formatAdminCount(dashboard.overview.students)} />
              <MetricCard
                label="Total de professores"
                value={formatAdminCount(dashboard.overview.tutors)}
              />
              <MetricCard
                label="Professores pendentes"
                value={formatAdminCount(dashboard.overview.pendingTutors)}
              />
              <MetricCard
                label="Reservas pendentes"
                value={formatAdminCount(dashboard.overview.pendingBookings)}
              />
              <MetricCard
                label="Reservas confirmadas"
                value={formatAdminCount(dashboard.overview.confirmedBookings)}
              />
              <MetricCard
                label="Reservas concluídas"
                value={formatAdminCount(dashboard.overview.completedBookings)}
              />
              <MetricCard
                label="Pagamentos aguardando"
                value={formatAdminCount(dashboard.overview.awaitingPayments)}
              />
              <MetricCard
                label="Pagamentos concluídos"
                value={formatAdminCount(dashboard.overview.completedPayments)}
              />
              <MetricCard
                label="Cancelamentos"
                value={formatAdminCount(dashboard.overview.cancellations)}
              />
              <MetricCard label="Reembolsos" value={formatAdminCount(dashboard.overview.refunds)} />
            </div>
          </Section>

          <Section
            id="professores"
            title="Professores"
            description="Status de verificação dos perfis de professor."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Pendentes" value={formatAdminCount(dashboard.tutors.pending)} />
              <MetricCard label="Aprovados" value={formatAdminCount(dashboard.tutors.approved)} />
              <MetricCard
                label="Alterações solicitadas"
                value={formatAdminCount(dashboard.tutors.changesRequested)}
              />
              <MetricCard label="Rejeitados" value={formatAdminCount(dashboard.tutors.rejected)} />
              <MetricCard label="Suspensos" value={formatAdminCount(dashboard.tutors.suspended)} />
            </div>
            <p className="text-sm text-muted-foreground">
              Para aprovar, recusar, pedir ajustes ou suspender, use a{" "}
              <Link href="/admin/tutors" className="font-medium text-primary-700 hover:underline">
                verificação de professores
              </Link>
              .
            </p>
          </Section>

          <Section
            id="reservas"
            title="Reservas"
            description="Reservas agrupadas pelo status operacional atual."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Pendentes" value={formatAdminCount(dashboard.bookings.pending)} />
              <MetricCard
                label="Aguardando pagamento"
                value={formatAdminCount(dashboard.bookings.awaitingPayment)}
              />
              <MetricCard
                label="Confirmadas"
                value={formatAdminCount(dashboard.bookings.confirmed)}
              />
              <MetricCard
                label="Concluídas"
                value={formatAdminCount(dashboard.bookings.completed)}
              />
              <MetricCard
                label="Canceladas"
                value={formatAdminCount(dashboard.bookings.cancelled)}
              />
            </div>
          </Section>

          <Section
            id="pagamentos"
            title="Pagamentos"
            description="Valores somados apenas de reservas com pagamento concluído. Campos incompletos não são estimados."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Valor bruto" value={formatAdminMoney(dashboard.payments.gross)} />
              <MetricCard
                label="Taxas da plataforma"
                value={formatAdminMoney(dashboard.payments.platformFees)}
              />
              <MetricCard
                label="Valor do professor"
                value={formatAdminMoney(dashboard.payments.tutorAmount)}
              />
              <MetricCard label="Reembolsos" value={formatAdminMoney(dashboard.payments.refunds)} />
            </div>
          </Section>

          <Section
            id="avaliacoes"
            title="Avaliações"
            description="Últimas avaliações registradas. Denúncias só aparecem quando o produto passar a suportá-las."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <MetricCard
                label="Avaliações denunciadas"
                value={formatAdminCount(dashboard.reviews.reported)}
                hint="Ainda não há fluxo de denúncia de avaliações."
              />
              <div className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60 lg:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">Avaliações recentes</h3>
                {!dashboard.reviews.recentAvailable ? (
                  <p className="mt-3 text-sm text-muted-foreground">{UNAVAILABLE_LABEL}</p>
                ) : dashboard.reviews.recent.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma avaliação encontrada.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {dashboard.reviews.recent.map((review) => (
                      <li key={review.id} className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
                        <p className="text-sm font-semibold text-foreground">
                          {review.rating.toLocaleString("pt-BR")} / 5
                          <span className="ml-2 font-normal text-muted-foreground">
                            {formatAdminDate(review.createdAt)}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-foreground">{review.comment || "Sem comentário."}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <Section
            id="usuarios"
            title="Usuários"
            description="Contas por papel. Suspensão hoje existe apenas no perfil de professor."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label="Alunos" value={formatAdminCount(dashboard.users.students)} />
              <MetricCard label="Professores" value={formatAdminCount(dashboard.users.tutors)} />
              <MetricCard
                label="Contas suspensas"
                value={formatAdminCount(dashboard.users.suspendedAccounts)}
                hint="Professores com verificação suspensa."
              />
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}
