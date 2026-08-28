"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import type { SignupRole } from "@/lib/auth/types";

interface UseRequireAuthOptions {
  roles?: SignupRole[];
  redirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { roles, redirectTo = "/login" } = options;
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const loginUrl =
        nextPath === "/"
          ? redirectTo
          : `${redirectTo}?redirect=${encodeURIComponent(nextPath)}`;

      router.replace(loginUrl);
      return;
    }

    if (roles && userDoc && !roles.includes(userDoc.role)) {
      router.replace("/");
    }
  }, [loading, pathname, redirectTo, roles, router, searchParams, user, userDoc]);

  const isAuthorized =
    !!user && (!roles || (!!userDoc && roles.includes(userDoc.role)));

  return {
    user,
    userDoc,
    loading: loading || !isAuthorized,
    isAuthorized,
  };
}
