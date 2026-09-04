export default function StudentDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando painel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-56 animate-pulse rounded-2xl bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-xl bg-muted/70" />
        </div>
        <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
      </div>

      <div className="h-14 animate-pulse rounded-3xl bg-muted/70" />

      <div className="h-48 animate-pulse rounded-3xl bg-muted/70" />

      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
      </div>

      <div className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
