"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { roleMatchesAny } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";

interface UseRequireAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { roles, redirectTo = "/login", unauthorizedRedirectTo = "/" } = options;
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  const hasRoleMismatch =
    !!roles && !!userDoc && !roleMatchesAny(userDoc.role, roles);
  const missingProfileForRoleGate = !!roles && !!user && !loading && !userDoc;

  useEffect(() => {
    if (loading || redirecting) {
      return;
    }

    if (!user) {
      setRedirecting(true);
      const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const loginUrl =
        nextPath === "/"
          ? redirectTo
          : `${redirectTo}?redirect=${encodeURIComponent(nextPath)}`;

      router.replace(loginUrl);
      return;
    }

    if (hasRoleMismatch) {
      setRedirecting(true);
      router.replace(unauthorizedRedirectTo);
      return;
    }

    if (missingProfileForRoleGate) {
      setRedirecting(true);
      router.replace(redirectTo);
    }
  }, [
    hasRoleMismatch,
    loading,
    missingProfileForRoleGate,
    pathname,
    redirectTo,
    redirecting,
    router,
    searchParams,
    unauthorizedRedirectTo,
    user,
  ]);

  const isAuthorized =
    !!user && (!roles || (!!userDoc && roleMatchesAny(userDoc.role, roles)));

  return {
    user,
    userDoc,
    loading: loading || redirecting || (!!user && !!roles && !userDoc) || !isAuthorized,
    isAuthorized,
  };
}
