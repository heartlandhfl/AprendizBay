"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getDashboardPath } from "@/lib/auth/dashboard";

export default function SejaProfessorRedirect() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user && userDoc) {
      router.replace(getDashboardPath(userDoc.role));
    }
  }, [loading, router, user, userDoc]);

  if (loading || (user && userDoc)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  return null;
}
