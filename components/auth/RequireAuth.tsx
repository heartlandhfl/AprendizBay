"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { SignupRole } from "@/lib/auth/types";

interface RequireAuthProps {
  children: ReactNode;
  roles?: SignupRole[];
}

export default function RequireAuth({ children, roles }: RequireAuthProps) {
  const { loading } = useRequireAuth({ roles });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  return <>{children}</>;
}
