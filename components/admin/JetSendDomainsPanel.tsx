"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";

import {
  createJetSendSendingDomain,
  fetchJetSendSendingDomains,
} from "@/lib/admin/jetsend-domains-client";
import type { JetSendSendingDomain } from "@/lib/jetsend/sending-domains";

function statusLabel(domain: JetSendSendingDomain): string {
  if (domain.verified) {
    return "Verificado";
  }
  if (domain.status) {
    return domain.status;
  }
  return "Pendente";
}

export default function JetSendDomainsPanel() {
  const [domains, setDomains] = useState<JetSendSendingDomain[]>([]);
  const [domainInput, setDomainInput] = useState("aprendizbay.com.br");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestDomain, setLatestDomain] = useState<JetSendSendingDomain | null>(null);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDomains(await fetchJetSendSendingDomains());
    } catch (caught) {
      setDomains([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os domínios do JetSend.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await createJetSendSendingDomain(domainInput);
      setLatestDomain(created);
      await loadDomains();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar o domínio no JetSend.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const dnsRecords = latestDomain?.dnsRecords ?? [];

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Domínios JetSend</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre e verifique domínios de envio pelo servidor Aprendiz Bay. A chave do JetSend
            nunca sai do backend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDomains()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span className="font-medium text-foreground">Domínio de envio</span>
          <input
            type="text"
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="aprendizbay.com.br"
            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Registrando...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Adicionar domínio
            </>
          )}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {latestDomain ? (
        <div className="space-y-3 rounded-2xl bg-primary-50 px-4 py-4 text-sm text-primary-900">
          <p>
            Domínio <strong>{latestDomain.domain}</strong> registrado no JetSend (
            {statusLabel(latestDomain)}).
          </p>
          {dnsRecords.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-primary-200 bg-white">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((record) => (
                    <tr key={`${record.type}-${record.name}-${record.value}`}>
                      <td className="px-3 py-2 font-mono text-xs">{record.type}</td>
                      <td className="px-3 py-2 font-mono text-xs">{record.name}</td>
                      <td className="px-3 py-2 font-mono text-xs break-all">{record.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>JetSend não retornou registros DNS nesta resposta. Consulte o painel do JetSend.</p>
          )}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Domínio</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">DNS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando domínios...
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum domínio registrado ainda.
                </td>
              </tr>
            ) : (
              domains.map((domain) => (
                <tr key={domain.domain}>
                  <td className="px-4 py-3 align-top font-medium">{domain.domain}</td>
                  <td className="px-4 py-3 align-top">{statusLabel(domain)}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">
                    {domain.dnsRecords.length > 0
                      ? `${domain.dnsRecords.length} registro(s)`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
