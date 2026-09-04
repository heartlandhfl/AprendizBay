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
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const requiresAdminClaim = !!roles?.includes("admin");

  useEffect(() => {
    if (!user || !requiresAdminClaim) {
      setTokenRole(null);
      setClaimsLoading(false);
      return;
    }

    let cancelled = false;
    setClaimsLoading(true);
    void user.getIdTokenResult().then((result) => {
      if (cancelled) {
        return;
      }
      const role = result.claims.role;
      setTokenRole(typeof role === "string" ? role : null);
      setClaimsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [requiresAdminClaim, user]);

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
