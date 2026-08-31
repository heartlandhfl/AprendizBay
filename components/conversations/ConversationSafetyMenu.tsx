"use client";

import { FormEvent, useState } from "react";
import { Ban, Flag, Loader2, X } from "lucide-react";
import {
  CONVERSATION_REPORT_REASONS,
  MAX_REPORT_DETAILS_LENGTH,
  type ConversationReportReason,
} from "@/lib/conversations/types";

interface ConversationSafetyMenuProps {
  otherName: string;
  blockedByMe: boolean;
  submitting?: boolean;
  error?: string | null;
  onReport: (reason: ConversationReportReason, details: string) => Promise<void>;
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
}

export default function ConversationSafetyMenu({
  otherName,
  blockedByMe,
  submitting = false,
  error,
  onReport,
  onBlock,
  onUnblock,
}: ConversationSafetyMenuProps) {
  const [dialog, setDialog] = useState<"report" | "block" | null>(null);
  const [reason, setReason] = useState<ConversationReportReason>("off_platform");
  const [details, setDetails] = useState("");
  const [reportSent, setReportSent] = useState(false);

  function closeDialog() {
    if (submitting) {
      return;
    }

    setDialog(null);
  }

  async function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onReport(reason, details);
      setReportSent(true);
      setDetails("");
      setDialog(null);
    } catch {
      // O erro é exibido pelo componente pai.
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setDialog("report")}
        className="inline-flex items-center gap-1.5 rounded-2xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Denunciar conversa
      </button>
      <button
        type="button"
        onClick={() => setDialog("block")}
        className="inline-flex items-center gap-1.5 rounded-2xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        {blockedByMe ? "Desbloquear usuário" : "Bloquear usuário"}
      </button>

      {reportSent && (
        <p className="basis-full text-right text-xs text-muted-foreground">
          Denúncia enviada. A equipe pode analisar o relato, sem abrir a conversa automaticamente.
        </p>
      )}

      {error && (
        <p className="basis-full text-right text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {dialog === "report" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-conversation-title"
        >
          <form
            onSubmit={handleReport}
            className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="report-conversation-title" className="text-xl font-bold text-foreground">
                  Denunciar conversa
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Envie um relato sobre {otherName}. As mensagens desta conversa não são
                  abertas automaticamente para administradores.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium">Motivo</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as ConversationReportReason)}
                className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                {CONVERSATION_REPORT_REASONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium">Detalhes (opcional)</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={MAX_REPORT_DETAILS_LENGTH}
                rows={4}
                placeholder="Descreva o que aconteceu. Não é necessário copiar a conversa inteira."
                className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Enviar denúncia
              </button>
            </div>
          </form>
        </div>
      )}

      {dialog === "block" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-user-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="block-user-title" className="text-xl font-bold text-foreground">
                  {blockedByMe ? "Desbloquear usuário?" : "Bloquear usuário?"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {blockedByMe
                    ? `Você poderá voltar a conversar com ${otherName}.`
                    : `Ao bloquear ${otherName}, vocês não poderão mais enviar mensagens. O histórico desta conversa continua visível só para vocês.`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (blockedByMe) {
                      await onUnblock();
                    } else {
                      await onBlock();
                    }
                    setDialog(null);
                  } catch {
                    // O erro é exibido pelo componente pai.
                  }
                }}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {blockedByMe ? "Desbloquear" : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
