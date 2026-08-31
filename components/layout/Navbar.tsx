"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePendingBookingCount } from "@/lib/bookings/usePendingBookingCount";
import { signOut } from "@/lib/auth/service";

export default function Navbar() {
  const router = useRouter();
  const { user, userDoc, loading } = useAuth();
  const pendingBookingCount = usePendingBookingCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  }

  const displayName = userDoc?.displayName || user?.displayName || "Usuário";
  const dashboardHref =
    userDoc?.role === "admin"
      ? "/admin"
      : userDoc?.role === "tutor"
        ? "/tutor/dashboard"
        : "/bookings";

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

          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="hidden rounded-2xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                Entrar
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
              >
                Cadastrar
              </Link>
            </>
          )}

          {!loading && user && (
            <Link
              href="/mensagens"
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mensagens</span>
            </Link>
          )}

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="max-w-[8rem] truncate sm:max-w-[12rem]">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-soft-lg"
                  role="menu"
                >
                  <Link
                    href={dashboardHref}
                    onClick={() => setMenuOpen(false)}
                    className="relative flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                    role="menuitem"
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {userDoc?.role === "admin" ? "Painel admin" : "Meu painel"}
                    {userDoc?.role === "tutor" && pendingBookingCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1.5 text-[10px] font-bold text-white">
                        {pendingBookingCount > 9 ? "9+" : pendingBookingCount}
                      </span>
                    )}
                  </Link>
                  {userDoc?.role === "tutor" && (
                    <Link
                      href="/tutor/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Perfil de professor
                    </Link>
                  )}
                  <Link
                    href="/mensagens"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                    role="menuitem"
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Mensagens
                  </Link>
                  <Link
                    href="/configuracoes"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                    role="menuitem"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Configurações
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}

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
