export default function ProfessorDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando painel do professor">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-xl bg-muted/70" />
        </div>
        <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="h-12 w-40 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-12 w-44 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-12 w-36 animate-pulse rounded-2xl bg-muted/70" />
      </div>

      <div className="h-48 animate-pulse rounded-3xl bg-muted/70" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted/70" />
    </div>
  );
}
