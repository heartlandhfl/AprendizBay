"use client";

import { Loader2 } from "lucide-react";
import type { TutorEarningsSummary } from "@/lib/tutors/earnings";
import { formatEarningsAmount } from "@/lib/tutors/earnings";

interface ProfessorEarningsSummaryProps {
  earnings: TutorEarningsSummary | null;
  loading: boolean;
}

export default function ProfessorEarningsSummary({
  earnings,
  loading,
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
      ) : earnings ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">Total recebido</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatEarningsAmount(earnings.paidTotal)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {earnings.paidCount} {earnings.paidCount === 1 ? "repasse" : "repasses"}
            </p>
          </article>
          <article className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">A receber</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatEarningsAmount(earnings.pendingTotal + earnings.processingTotal)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {earnings.pendingCount + earnings.processingCount} em processamento
            </p>
          </article>
          <article className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50">
            <p className="text-sm text-muted-foreground">Período atual</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatEarningsAmount(earnings.paidTotal + earnings.pendingTotal + earnings.processingTotal)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Soma de repasses pagos e pendentes registrados
            </p>
          </article>
        </div>
      ) : (
        <div className="rounded-3xl bg-surface p-6 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">
            Seus ganhos aparecerão aqui depois que aulas pagas forem concluídas e processadas.
          </p>
        </div>
      )}
    </section>
  );
}
