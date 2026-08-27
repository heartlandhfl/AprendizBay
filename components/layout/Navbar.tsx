import Link from "next/link";
import { GraduationCap, Search, Menu } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-primary-700 transition-colors hover:text-primary-600"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-soft">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:inline">
            Aprendiz Bay
          </span>
        </Link>

        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Busque por matéria, professor ou cidade..."
            className="h-10 w-full rounded-2xl border border-border bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
            aria-label="Buscar professores ou matérias"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/seja-professor"
            className="hidden rounded-2xl px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 sm:inline-flex"
          >
            Seja um Professor
          </Link>

          <Link
            href="/entrar"
            className="hidden rounded-2xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
          >
            Entrar
          </Link>

          <Link
            href="/cadastro"
            className="inline-flex items-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
          >
            Cadastre-se
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-muted md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <div className="border-t border-border/60 px-4 py-3 md:hidden">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Busque por matéria, professor ou cidade..."
            className="h-10 w-full rounded-2xl border border-border bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
            aria-label="Buscar professores ou matérias"
          />
        </div>
      </div>
    </header>
  );
}
