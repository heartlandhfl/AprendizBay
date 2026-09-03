"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";

import MetricCard from "@/components/admin/MetricCard";
import {
  CONTACT_EMAIL_DELIVERY_OPTIONS,
  CONTACT_INBOX_STATUS_OPTIONS,
  type AdminContactInboxDetail,
  type AdminContactInboxFilters,
  type AdminContactInboxList,
} from "@/lib/admin/contact-inbox-shared";
import {
  fetchAdminContactInbox,
  fetchAdminContactInboxMessage,
  updateAdminContactInboxMessage,
} from "@/lib/admin/contact-inbox-client";
import { formatAdminCount, formatAdminDate } from "@/lib/admin/format";

const EMPTY_FILTERS: AdminContactInboxFilters = {};

function statusLabel(status: string): string {
  switch (status) {
    case "unread":
      return "Não lida";
    case "read":
      return "Lida";
    case "replied":
      return "Respondida";
    case "archived":
      return "Arquivada";
    default:
      return status;
  }
}

function deliveryLabel(delivery: string): string {
  switch (delivery) {
    case "sent":
      return "E-mail enviado";
    case "failed":
      return "Falha no envio";
    case "skipped":
      return "E-mail ignorado";
    default:
      return delivery;
  }
}

function deliveryBadgeClass(delivery: string): string {
  switch (delivery) {
    case "sent":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "failed":
      return "bg-red-50 text-red-800 ring-red-200";
    case "skipped":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "unread":
      return "bg-primary-50 text-primary-800 ring-primary-200";
    case "read":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "replied":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "archived":
      return "bg-muted text-muted-foreground ring-border";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

export default function ContactInboxPanel() {
  const [inbox, setInbox] = useState<AdminContactInboxList | null>(null);
  const [filters, setFilters] = useState<AdminContactInboxFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AdminContactInboxFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<AdminContactInboxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadInbox = useCallback(async (nextFilters: AdminContactInboxFilters) => {
    setLoading(true);
    setError(null);

    try {
      setInbox(await fetchAdminContactInbox(nextFilters));
      setFilters(nextFilters);
    } catch (caught) {
      setInbox(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar a caixa de entrada de contatos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessage = useCallback(async (messageId: string) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const message = await fetchAdminContactInboxMessage(messageId);
      setSelectedId(messageId);
      setSelectedMessage(message);
    } catch (caught) {
      setSelectedMessage(null);
      setDetailError(
        caught instanceof Error ? caught.message : "Não foi possível carregar a mensagem.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox(EMPTY_FILTERS);
  }, [loadInbox]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadInbox(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    void loadInbox(EMPTY_FILTERS);
  }

  async function handleStatusChange(status: AdminContactInboxDetail["status"]) {
    if (!selectedId) {
      return;
    }

    setUpdating(true);
    setDetailError(null);

    try {
      const updated = await updateAdminContactInboxMessage(selectedId, { status });
      setSelectedMessage(updated);
      await loadInbox(filters);
    } catch (caught) {
      setDetailError(
        caught instanceof Error ? caught.message : "Não foi possível atualizar a mensagem.",
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading && !inbox) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando caixa de entrada de contatos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caixa de Entrada de Contatos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensagens recebidas pelo formulário de contato, incluindo fallbacks quando o envio por
            e-mail falha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox(filters)}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {inbox ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total" value={formatAdminCount(inbox.summary.total)} />
            <MetricCard label="Não lidas" value={formatAdminCount(inbox.summary.unread)} />
            <MetricCard label="Respondidas" value={formatAdminCount(inbox.summary.replied)} />
            <MetricCard
              label="Falhas de e-mail"
              value={formatAdminCount(inbox.summary.deliveryFailed)}
            />
            <MetricCard
              label="E-mails ignorados"
              value={formatAdminCount(inbox.summary.deliverySkipped)}
            />
            <MetricCard label="Lidas" value={formatAdminCount(inbox.summary.read)} />
            <MetricCard label="Arquivadas" value={formatAdminCount(inbox.summary.archived)} />
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
              <span className="font-medium text-foreground">Status</span>
              <select
                value={draftFilters.status ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: (event.target.value || undefined) as AdminContactInboxFilters["status"],
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {CONTACT_INBOX_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Entrega de e-mail</span>
              <select
                value={draftFilters.emailDelivery ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    emailDelivery: (event.target.value ||
                      undefined) as AdminContactInboxFilters["emailDelivery"],
                  }))
                }
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              >
                <option value="">Todos</option>
                {CONTACT_EMAIL_DELIVERY_OPTIONS.map((delivery) => (
                  <option key={delivery} value={delivery}>
                    {deliveryLabel(delivery)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-foreground">Buscar</span>
              <input
                type="search"
                value={draftFilters.search ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value || undefined,
                  }))
                }
                placeholder="Nome, e-mail ou trecho da mensagem"
                className="h-10 w-full rounded-xl border border-border bg-surface px-3"
              />
            </label>

            <div className="flex items-end gap-2 md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                disabled={loading}
              >
                Filtrar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                disabled={loading}
              >
                Limpar
              </button>
            </div>
          </form>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Mensagens</h2>
                {inbox.truncated ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Exibindo as mensagens mais recentes. Refine os filtros para localizar registros
                    antigos.
                  </p>
                ) : null}
              </div>

              {inbox.messages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground">
                  <Mail className="h-8 w-8" aria-hidden="true" />
                  <p>Nenhuma mensagem encontrada com os filtros atuais.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {inbox.messages.map((message) => {
                    const selected = selectedId === message.messageId;

                    return (
                      <li key={message.messageId}>
                        <button
                          type="button"
                          onClick={() => void loadMessage(message.messageId)}
                          className={`w-full px-4 py-4 text-left transition-colors hover:bg-muted/40 ${
                            selected ? "bg-primary-50/70" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{message.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(message.status)}`}
                            >
                              {statusLabel(message.status)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${deliveryBadgeClass(message.emailDelivery)}`}
                            >
                              {deliveryLabel(message.emailDelivery)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{message.email}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-foreground">
                            {message.messagePreview}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatAdminDate(message.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">Detalhes</h2>

              {detailLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
                </div>
              ) : selectedMessage ? (
                <div className="mt-4 space-y-4">
                  {detailError ? (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                      {detailError}
                    </p>
                  ) : null}

                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">{selectedMessage.name}</p>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-sm text-primary-700 hover:underline"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ring-1 ${statusBadgeClass(selectedMessage.status)}`}
                    >
                      {statusLabel(selectedMessage.status)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ring-1 ${deliveryBadgeClass(selectedMessage.emailDelivery)}`}
                    >
                      {deliveryLabel(selectedMessage.emailDelivery)}
                    </span>
                  </div>

                  {selectedMessage.emailSkipReason ? (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Motivo do fallback: {selectedMessage.emailSkipReason}
                    </p>
                  ) : null}

                  <div className="rounded-xl bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>

                  <dl className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-4">
                      <dt>Recebida em</dt>
                      <dd>{formatAdminDate(selectedMessage.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Lida em</dt>
                      <dd>{formatAdminDate(selectedMessage.readAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Respondida em</dt>
                      <dd>{formatAdminDate(selectedMessage.respondedAt)}</dd>
                    </div>
                    {selectedMessage.assignedTo ? (
                      <div className="flex justify-between gap-4">
                        <dt>Responsável</dt>
                        <dd className="font-mono text-xs">{selectedMessage.assignedTo}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {CONTACT_INBOX_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void handleStatusChange(status)}
                        disabled={updating || selectedMessage.status === status}
                        className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Selecione uma mensagem para ver os detalhes e atualizar o status.
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
