"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { accountSetupRedirectTarget } from "@/lib/auth/account-setup";
import { useAccountSetupStatus } from "@/lib/auth/useAccountSetupStatus";

export default function AccountSetupGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userDoc, loading: authLoading } = useAuth();
  const { learningProfile, tutorDoc, loading: setupLoading } = useAccountSetupStatus();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (authLoading || setupLoading || !user || !userDoc || redirecting) {
      return;
    }

    const target = accountSetupRedirectTarget({
      pathname,
      role: userDoc.role,
      userDoc,
      learningProfile,
      tutorDoc,
    });

    if (target && target !== pathname) {
      setRedirecting(true);
      router.replace(target);
    }
  }, [
    authLoading,
    learningProfile,
    pathname,
    redirecting,
    router,
    setupLoading,
    tutorDoc,
    user,
    userDoc,
  ]);

  return null;
}
