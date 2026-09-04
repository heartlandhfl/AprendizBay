"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const LINKS = [
  {
    href: "/search",
    label: "Encontrar Professor",
    description: "Busque professores verificados por matéria, cidade ou modalidade.",
    icon: Search,
  },
  {
    href: "/bookings",
    label: "Minhas Aulas",
    description: "Acompanhe reservas, pagamentos e o link das suas aulas.",
    icon: BookOpen,
  },
  {
    href: "/mensagens",
    label: "Mensagens",
    description: "Fale com seus professores e acompanhe conversas em andamento.",
    icon: MessageCircle,
  },
] as const;

export default function StudentHome() {
  const { userDoc, user } = useAuth();
  const firstName = (userDoc?.displayName || user?.displayName || "Aluno").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary-700">Olá, {firstName}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Início</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Encontre um professor, acompanhe suas aulas e continue de onde parou.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 transition-colors hover:bg-muted/40"
            >
              <Icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
              <h2 className="mt-4 text-base font-semibold text-foreground">{item.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
