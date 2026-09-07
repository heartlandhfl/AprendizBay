"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  computeAuthLoading,
  computeHasRoleMismatch,
  computeIsAuthorized,
  computeMissingProfileForRoleGate,
  computeNeedsEmailVerification,
  requiresAdminClaim,
  resolveAuthRedirectUrl,
  shouldDeferAuthRedirect,
  type AuthGateContext,
} from "@/lib/auth/require-auth-state";
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

  const adminClaimRequired = requiresAdminClaim(roles);
  const { tokenRole, loading: claimsLoading } = useTokenRole(user, {
    enabled: adminClaimRequired,
    forceRefresh: adminClaimRequired,
  });

  const gateContext = useMemo<AuthGateContext>(
    () => ({
      options: {
        roles,
        redirectTo,
        unauthorizedRedirectTo,
        skipSetupGate,
        skipEmailVerification,
      },
      user,
      userDoc,
      loading,
      tokenRole,
      claimsLoading,
      pathname,
      searchParams,
      setupLoading,
      learningProfile,
      tutorDoc,
    }),
    [
      claimsLoading,
      learningProfile,
      loading,
      pathname,
      redirectTo,
      roles,
      searchParams,
      setupLoading,
      skipEmailVerification,
      skipSetupGate,
      tokenRole,
      tutorDoc,
      unauthorizedRedirectTo,
      user,
      userDoc,
    ],
  );

  const hasRoleMismatch = computeHasRoleMismatch(gateContext);
  const missingProfileForRoleGate = computeMissingProfileForRoleGate(gateContext);
  const needsEmailVerification = computeNeedsEmailVerification(gateContext);
  const isAuthorized = computeIsAuthorized(gateContext);

  useEffect(() => {
    if (shouldDeferAuthRedirect(gateContext, redirecting)) {
      return;
    }

    const redirectUrl = resolveAuthRedirectUrl(gateContext);
    if (!redirectUrl) {
      return;
    }

    setRedirecting(true);
    router.replace(redirectUrl);
  }, [
    gateContext,
    hasRoleMismatch,
    missingProfileForRoleGate,
    needsEmailVerification,
    redirecting,
    router,
  ]);

  return {
    user,
    userDoc,
    loading: computeAuthLoading(gateContext, redirecting, isAuthorized),
    isAuthorized,
  };
}
