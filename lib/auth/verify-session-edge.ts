import { jwtVerify, createRemoteJWKSet } from "jose";

const SESSION_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys"),
);

function getFirebaseProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    ""
  );
}

export interface VerifiedSession {
  uid: string;
  role?: string;
  emailVerified?: boolean;
}

export async function verifySessionCookieEdge(
  sessionCookie: string,
): Promise<VerifiedSession | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId || !sessionCookie.trim()) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, SESSION_JWKS, {
      issuer: `https://session.firebase.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = typeof payload.sub === "string" ? payload.sub : "";
    if (!uid) {
      return null;
    }

    return {
      uid,
      role: typeof payload.role === "string" ? payload.role : undefined,
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}
