"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import {
  DELIVERY_STATUS_OPTIONS,
  EMAIL_EVENT_OPTIONS,
  OUTBOX_STATUS_OPTIONS,
  type AdminEmailDeliveryMonitor,
  type AdminEmailOutboxFilters,
} from "@/lib/admin/email-outbox";
import { fetchAdminEmailDeliveryMonitor } from "@/lib/admin/email-outbox-client";
import { formatAdminCount, formatAdminDate } from "@/lib/admin/format";

const PROVIDER_OPTIONS = ["jetsend", "resend", "sendgrid"] as const;

const EMPTY_FILTERS: AdminEmailOutboxFilters = {};

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "processing":
      return "Processando";
    case "sent":
      return "Enviado";
    case "failed":
      return "Falhou";
    case "permanent_failure":
      return "Falha permanente";
    case "delivered":
      return "Entregue";
    case "bounced":
      return "Bounce";
    case "complained":
      return "Reclamação";
    default:
      return status;
  }
}

export default function EmailDeliveryMonitor() {
  const [monitor, setMonitor] = useState<AdminEmailDeliveryMonitor | null>(null);
  const [filters, setFilters] = useState<AdminEmailOutboxFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AdminEmailOutboxFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonitor = useCallback(async (nextFilters: AdminEmailOutboxFilters) => {
    setLoading(true);
    setError(null);

    try {
      setMonitor(await fetchAdminEmailDeliveryMonitor(nextFilters));
      setFilters(nextFilters);
    } catch (caught) {
      setMonitor(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar o monitor de e-mails.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitor(EMPTY_FILTERS);
  }, [loadMonitor]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMonitor(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    void loadMonitor(EMPTY_FILTERS);
  }

  if (loading && !monitor) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando monitor de e-mails...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitor de e-mails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe envios transacionais, entregas e falhas. Conteúdo das mensagens não é
            exibido nesta tela.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadMonitor(filters)}
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

      {monitor?.alerts.length ? (
        <div className="space-y-3">
          {monitor.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                alert.severity === "critical"
                  ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                  : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
              }`}
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-1">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {monitor ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total enviados"
              value={formatAdminCount(monitor.summary.totalSent)}
            />
            <MetricCard label="Pendentes" value={formatAdminCount(monitor.summary.pending)} />
            <MetricCard
              label="Processando"
              value={formatAdminCount(monitor.summary.processing)}
            />
            <MetricCard label="Entregues" value={formatAdminCount(monitor.summary.delivered)} />
            <MetricCard label="Falhas temporárias" value={formatAdminCount(monitor.summary.failed)} />
            <MetricCard label="Bounces" value={formatAdminCount(monitor.summary.bounced)} />
            <MetricCard
              label="Reclamações"
              value={formatAdminCount(monitor.summary.complained)}
            />
            <MetricCard
              label="Falhas permanentes"
              value={formatAdminCount(monitor.summary.permanentlyFailed)}
            />
          </div>

          <form
            onSubmit={applyFilters}
            className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Data inicial</span>
              <input
                type="date"
                value={draftFilters.dateFrom ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    dateFrom: event.target.value || undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Data final</span>
              <input
                type="date"
                value={draftFilters.dateTo ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    dateTo: event.target.value || undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Evento</span>
              <select
                value={draftFilters.eventName ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    eventName: event.target.value || undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {EMAIL_EVENT_OPTIONS.map((eventName) => (
                  <option key={eventName} value={eventName}>
                    {eventName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Destinatário</span>
              <input
                type="search"
                value={draftFilters.recipient ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    recipient: event.target.value || undefined,
                  }))
                }
                placeholder="E-mail ou ID do usuário"
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Reserva</span>
              <input
                type="search"
                value={draftFilters.bookingId ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    bookingId: event.target.value || undefined,
                  }))
                }
                placeholder="ID da reserva"
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Provedor</span>
              <select
                value={draftFilters.provider ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    provider: event.target.value || undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {PROVIDER_OPTIONS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Status do outbox</span>
              <select
                value={draftFilters.status ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: (event.target.value as AdminEmailOutboxFilters["status"]) || undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {OUTBOX_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Status de entrega</span>
              <select
                value={draftFilters.deliveryStatus ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    deliveryStatus:
                      (event.target.value as AdminEmailOutboxFilters["deliveryStatus"]) ||
                      undefined,
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {DELIVERY_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                disabled={loading}
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                disabled={loading}
              >
                Limpar
              </button>
            </div>
          </form>

          {monitor.truncated ? (
            <p className="text-sm text-muted-foreground">
              Mostrando os registros mais recentes. Refine os filtros para reduzir o conjunto.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Evento</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Destinatário</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Assunto</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Criado</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Enviado</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Entrega</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Tentativas</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Message ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Último erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {monitor.emails.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum e-mail encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  monitor.emails.map((email) => (
                    <tr key={email.emailId}>
                      <td className="px-4 py-3 align-top font-mono text-xs">{email.eventName}</td>
                      <td className="px-4 py-3 align-top">{email.recipientEmail}</td>
                      <td className="max-w-xs px-4 py-3 align-top">{email.subject}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {formatAdminDate(email.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {formatAdminDate(email.sentAt)}
                      </td>
                      <td className="px-4 py-3 align-top">{statusLabel(email.status)}</td>
                      <td className="px-4 py-3 align-top">
                        {email.deliveryStatus ? statusLabel(email.deliveryStatus) : "—"}
                      </td>
                      <td className="px-4 py-3 align-top">{email.attempts}</td>
                      <td className="max-w-[10rem] truncate px-4 py-3 align-top font-mono text-xs">
                        {email.providerMessageId ?? "—"}
                      </td>
                      <td className="max-w-xs px-4 py-3 align-top text-xs text-muted-foreground">
                        {email.lastError ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
