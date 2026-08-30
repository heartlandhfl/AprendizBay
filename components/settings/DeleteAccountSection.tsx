"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCurrentAccount } from "@/lib/account/client";
import { signOut } from "@/lib/auth/service";

const CONFIRM_PHRASE = "EXCLUIR CONTA";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);

    try {
      await deleteCurrentAccount();
      try {
        await signOut();
      } catch {
        // Firebase Auth already removed the user on the server.
      }
      router.replace("/");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir a conta.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canDelete = understood && confirmation.trim() === CONFIRM_PHRASE && !submitting;

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/60 p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Excluir conta</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Direito do titular (LGPD, art. 18). Apagamos o documento{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">users/{"{seu id}"}</code>{" "}
            e a autenticação. Reservas e avaliações são{" "}
            <strong className="font-medium text-foreground">anonimizadas e mantidas</strong>,
            para preservar o histórico da outra parte e as notas públicas.
            Mensagens e o perfil de professor, se houver, são anonimizados.
          </p>

          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              Excluir minha conta
            </button>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(event) => setUnderstood(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-red-600 focus:ring-red-200"
                />
                <span>
                  Entendi que reservas e avaliações continuam no sistema de
                  forma anonimizada e que reservas pagas ativas precisam ser
                  canceladas antes.
                </span>
              </label>

              <div>
                <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium">
                  Digite {CONFIRM_PHRASE} para confirmar
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm transition-colors focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setOpen(false);
                    setConfirmation("");
                    setUnderstood(false);
                    setError(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={() => void handleDelete()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    "Confirmar exclusão"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
