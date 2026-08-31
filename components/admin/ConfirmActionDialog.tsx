"use client";

import { X } from "lucide-react";

interface ConfirmActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonValue: string;
  onReasonChange: (value: string) => void;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  confirmClassName = "bg-red-600 hover:bg-red-700",
  requireReason = false,
  reasonLabel = "Motivo",
  reasonValue,
  onReasonChange,
  submitting = false,
  error,
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="confirm-action-title" className="text-xl font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {requireReason && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">{reasonLabel}</span>
            <textarea
              value={reasonValue}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Descreva o motivo para o professor."
            />
          </label>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${confirmClassName}`}
          >
            {submitting ? "Confirmando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
