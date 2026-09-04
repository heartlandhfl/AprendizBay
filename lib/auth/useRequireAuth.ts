"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { accountSetupRedirectTarget } from "@/lib/auth/account-setup";
import { roleMatchesAny } from "@/lib/auth/roles";
import { useAccountSetupStatus } from "@/lib/auth/useAccountSetupStatus";
import type { UserRole } from "@/lib/auth/types";

interface UseRequireAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
  skipSetupGate?: boolean;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const {
    roles,
    redirectTo = "/login",
    unauthorizedRedirectTo = "/",
    skipSetupGate = false,
  } = options;
  const { user, userDoc, loading } = useAuth();
  const {
    learningProfile,
    tutorDoc,
    loading: setupLoading,
  } = useAccountSetupStatus();
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
      return;
    }

    if (skipSetupGate || setupLoading || !userDoc) {
      return;
    }

    const setupRedirect = accountSetupRedirectTarget({
      pathname,
      role: userDoc.role,
      userDoc,
      learningProfile,
      tutorDoc,
    });

    if (setupRedirect && setupRedirect !== pathname) {
      setRedirecting(true);
      router.replace(setupRedirect);
    }
  }, [
    hasRoleMismatch,
    learningProfile,
    loading,
    missingProfileForRoleGate,
    pathname,
    redirectTo,
    redirecting,
    router,
    searchParams,
    setupLoading,
    skipSetupGate,
    tutorDoc,
    unauthorizedRedirectTo,
    user,
    userDoc,
  ]);

  const isAuthorized =
    !!user && (!roles || (!!userDoc && roleMatchesAny(userDoc.role, roles)));

  return {
    user,
    userDoc,
    loading:
      loading ||
      redirecting ||
      (!skipSetupGate && setupLoading) ||
      (!!user && !!roles && !userDoc) ||
      !isAuthorized,
    isAuthorized,
  };
}
