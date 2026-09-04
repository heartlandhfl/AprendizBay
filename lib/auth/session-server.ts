import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";

import { AUTH_SESSION_MAX_AGE_MS } from "@/lib/auth/session-constants";

export async function createAuthSessionCookie(idToken: string): Promise<string> {
  const auth = getAuth(getAdminApp());
  return auth.createSessionCookie(idToken, { expiresIn: AUTH_SESSION_MAX_AGE_MS });
}

export async function verifyAuthSessionCookie(sessionCookie: string) {
  const auth = getAuth(getAdminApp());
  return auth.verifySessionCookie(sessionCookie, true);
}
