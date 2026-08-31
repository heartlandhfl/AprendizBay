export default function TutorProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="sr-only">Carregando perfil do professor...</p>
      <div className="mb-6 h-5 w-40 animate-pulse rounded-full bg-muted" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-6">
          <div className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="h-32 w-32 animate-pulse rounded-full bg-muted sm:h-40 sm:w-40" />
              <div className="w-full flex-1 space-y-3">
                <div className="mx-auto h-8 w-2/3 animate-pulse rounded-lg bg-muted sm:mx-0" />
                <div className="mx-auto h-4 w-1/2 animate-pulse rounded-lg bg-muted sm:mx-0" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-muted/70" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
        </div>
        <div className="mt-8 h-80 animate-pulse rounded-2xl bg-muted/70 lg:mt-0" />
      </div>
    </div>
  );
}
