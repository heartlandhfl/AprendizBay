"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin#professores", label: "Professores" },
  { href: "/admin#reservas", label: "Reservas" },
  { href: "/admin#pagamentos", label: "Pagamentos" },
  { href: "/admin#avaliacoes", label: "Avaliações" },
  { href: "/admin#usuarios", label: "Usuários" },
  { href: "/admin/tutors", label: "Verificação" },
  { href: "/admin/payouts", label: "Repasses" },
  { href: "/admin/facilitator-payouts", label: "Facilitadores" },
  { href: "/admin/email", label: "E-mails" },
  { href: "/admin/contact-inbox", label: "Caixa de Entrada" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Área administrativa">
      {LINKS.map((link) => {
        const current =
          (link.href === "/admin" && pathname === "/admin") ||
          (link.href === "/admin/tutors" && pathname.startsWith("/admin/tutors")) ||
          (link.href === "/admin/payouts" && pathname.startsWith("/admin/payouts")) ||
          (link.href === "/admin/facilitator-payouts" &&
            pathname.startsWith("/admin/facilitator-payouts")) ||
          (link.href === "/admin/email" && pathname.startsWith("/admin/email")) ||
          (link.href === "/admin/contact-inbox" &&
            pathname.startsWith("/admin/contact-inbox"));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              current
                ? "bg-primary-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-current={current ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
