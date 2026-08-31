import { UNAVAILABLE_LABEL } from "@/lib/admin/format";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

export default function MetricCard({ label, value, hint }: MetricCardProps) {
  const unavailable = value === UNAVAILABLE_LABEL;

  return (
    <article className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-border/60">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight ${
          unavailable ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
