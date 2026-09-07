"use client";

import type { User } from "firebase/auth";

export async function establishAuthSession(user: User): Promise<void> {
  // Force refresh so custom claims (admin, lecturer, …) are embedded in the session cookie.
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Não foi possível iniciar a sessão.");
  }
}

export async function clearAuthSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
}
