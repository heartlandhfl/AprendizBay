"use client";

import { Loader2 } from "lucide-react";
import type { TutorEarningsSummary } from "@/lib/tutors/earnings";
import { formatEarningsAmount } from "@/lib/tutors/earnings";

interface ProfessorEarningsSummaryProps {
  earnings: TutorEarningsSummary | null;
  loading: boolean;
  error: string | null;
}

export default function ProfessorEarningsSummary({
  earnings,
  loading,
  error,
}: ProfessorEarningsSummaryProps) {
  return (
    <section id="ganhos" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Ganhos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Valores oficiais dos seus repasses. Este resumo é somente leitura.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-3xl bg-surface shadow-soft ring-1 ring-border/60">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
          <span className="sr-only">Carregando ganhos...</span>
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : earnings ? (
        <div className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">Ganhos pagos</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatEarningsAmount(earnings.paidTotal)}
          </p>
          {earnings.pendingTotal > 0 || earnings.processingTotal > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              A receber: {formatEarningsAmount(earnings.pendingTotal + earnings.processingTotal)}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Os repasses aparecem aqui depois que uma aula paga é concluída.
            </p>
          )}
          <a
            href="#ganhos"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver ganhos
          </a>
        </div>
      ) : null}
    </section>
  );
}
