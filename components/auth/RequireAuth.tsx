"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { UserRole } from "@/lib/auth/types";

interface RequireAuthProps {
  children: ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
  skipSetupGate?: boolean;
  skipEmailVerification?: boolean;
}

export default function RequireAuth({
  children,
  roles,
  redirectTo,
  unauthorizedRedirectTo,
  skipSetupGate,
  skipEmailVerification,
}: RequireAuthProps) {
  const { loading } = useRequireAuth({
    roles,
    redirectTo,
    unauthorizedRedirectTo,
    skipSetupGate,
    skipEmailVerification,
  });

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
