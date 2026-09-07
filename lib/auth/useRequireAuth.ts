"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { accountSetupRedirectTarget } from "@/lib/auth/account-setup";
import { roleMatchesAny } from "@/lib/auth/roles";
import { useTokenRole } from "@/lib/auth/useTokenRole";
import { useAccountSetupStatus } from "@/lib/auth/useAccountSetupStatus";
import type { UserRole } from "@/lib/auth/types";

interface UseRequireAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
  skipSetupGate?: boolean;
  skipEmailVerification?: boolean;
}

function usesPasswordProvider(user: { providerData?: Array<{ providerId: string }> }): boolean {
  return user.providerData?.some((provider) => provider.providerId === "password") ?? false;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const {
    roles,
    redirectTo = "/login",
    unauthorizedRedirectTo = "/",
    skipSetupGate = false,
    skipEmailVerification = false,
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

  const requiresAdminClaim = !!roles?.includes("admin");
  const { tokenRole, loading: claimsLoading } = useTokenRole(user, {
    enabled: requiresAdminClaim,
    forceRefresh: requiresAdminClaim,
  });

  const hasRoleMismatch = requiresAdminClaim
    ? !!user && tokenRole !== "admin"
    : !!roles && !!userDoc && !roleMatchesAny(userDoc.role, roles);
  const missingProfileForRoleGate = !!roles && !!user && !loading && !userDoc && !requiresAdminClaim;
  const needsEmailVerification =
    !skipEmailVerification &&
    !!user &&
    !user.emailVerified &&
    usesPasswordProvider(user) &&
    pathname !== "/verify-email";

  useEffect(() => {
    if (loading || redirecting || claimsLoading) {
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

    if (needsEmailVerification) {
      setRedirecting(true);
      router.replace("/verify-email");
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
    claimsLoading,
    hasRoleMismatch,
    learningProfile,
    loading,
    missingProfileForRoleGate,
    needsEmailVerification,
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

  const isAuthorized = requiresAdminClaim
    ? !!user && tokenRole === "admin"
    : !!user && (!roles || (!!userDoc && roleMatchesAny(userDoc.role, roles)));

  return {
    user,
    userDoc,
    loading:
      loading ||
      claimsLoading ||
      redirecting ||
      (!skipSetupGate && setupLoading) ||
      (!!user && !!roles && !requiresAdminClaim && !userDoc) ||
      !isAuthorized,
    isAuthorized,
  };
}
