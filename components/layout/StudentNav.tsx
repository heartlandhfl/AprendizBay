"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Heart,
  Home,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { normalizeRole } from "@/lib/auth/roles";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/search", label: "Encontrar Professor", icon: Search },
  { href: "/bookings", label: "Minhas Aulas", icon: BookOpen },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/search?lessonType=coletivo", label: "Favoritos", icon: Heart, disabled: true },
  { href: "/configuracoes", label: "Perfil", icon: UserRound },
] as const;

export default function StudentNav() {
  const pathname = usePathname();
  const { userDoc } = useAuth();

  if (!userDoc || normalizeRole(userDoc.role) !== "student") {
    return null;
  }

  return (
    <nav
      aria-label="Navegação do aluno"
      className="overflow-x-auto border-b border-border/60 bg-surface/80"
    >
      <ul className="mx-auto flex max-w-7xl gap-1 px-4 py-2 sm:px-6 lg:px-8">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          if ("disabled" in item && item.disabled) {
            return (
              <li key={item.label}>
                <span
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground/60"
                  title="Em breve"
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
