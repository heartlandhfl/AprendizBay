"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sanitizeSearchReturnPath } from "@/lib/tutors/search-params";

export default function TutorBackToSearch() {
  const searchParams = useSearchParams();
  const href = sanitizeSearchReturnPath(searchParams.get("from")) ?? "/search";

  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Voltar aos resultados
    </Link>
  );
}
