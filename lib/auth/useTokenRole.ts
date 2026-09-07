"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { CanonicalRole } from "@/lib/auth/roles";
import { readTokenRole } from "@/lib/auth/token-role";

interface UseTokenRoleOptions {
  enabled?: boolean;
  forceRefresh?: boolean;
}

export function useTokenRole(
  user: User | null,
  { enabled = true, forceRefresh = false }: UseTokenRoleOptions = {},
): { tokenRole: CanonicalRole | null; loading: boolean } {
  const [tokenRole, setTokenRole] = useState<CanonicalRole | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !enabled) {
      setTokenRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void readTokenRole(user, forceRefresh).then((role) => {
      if (cancelled) {
        return;
      }
      setTokenRole(role);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, forceRefresh, user]);

  return { tokenRole, loading };
}
