import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, requireFirebaseApp } from "@/lib/firebase/client";
import type { SignupRole } from "@/lib/auth/types";
import { writeOwnPublicProfile } from "@/lib/users/public-profile";
import { clearAuthSession, establishAuthSession } from "@/lib/auth/session-client";

const PUBLIC_DISPLAY_NAME_MAX_LENGTH = 120;

async function syncSignupRoleClaim(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/sync-signup-role", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    console.warn(
      "[Aprendiz Bay] Falha ao sincronizar papel de professor:",
      payload?.error ?? response.status,
    );
    return;
  }

  await user.getIdToken(true);
}

const googleProvider = new GoogleAuthProvider();

interface CreateUserDocumentInput {
  role: SignupRole;
  displayName: string;
  email: string;
  photoUrl?: string | null;
}

function normalizeDisplayName(value: string | null | undefined): string {
  const trimmed = value?.trim() || "Usuário";
  return trimmed.slice(0, PUBLIC_DISPLAY_NAME_MAX_LENGTH);
}

async function resolveSignupEmail(user: User, fallbackEmail?: string | null): Promise<string> {
  const tokenResult = await user.getIdTokenResult();
  const tokenEmail =
    typeof tokenResult.claims.email === "string" ? tokenResult.claims.email : null;
  const email = (tokenEmail ?? fallbackEmail ?? user.email ?? "").trim().toLowerCase();

  if (!email) {
    throw new Error("Não foi possível obter o e-mail da conta Google.");
  }

  return email;
}

async function createUserDocument(
  uid: string,
  { role, displayName, email, photoUrl }: CreateUserDocumentInput,
): Promise<void> {
  await requireFirebaseApp();
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedEmail = email.trim().toLowerCase();

  await setDoc(doc(db, "users", uid), {
    role,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
    ...(photoUrl ? { photoUrl } : {}),
    createdAt: serverTimestamp(),
  });
  await writeOwnPublicProfile(uid, { displayName: normalizedDisplayName, photoUrl });
}

async function ensureTutorClaim(user: User, role: SignupRole): Promise<void> {
  if (role === "tutor") {
    await syncSignupRoleClaim(user);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: SignupRole,
): Promise<User> {
  await requireFirebaseApp();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const normalizedEmail = email.trim().toLowerCase();

  await updateProfile(credential.user, { displayName: normalizeDisplayName(displayName) });
  await createUserDocument(credential.user.uid, {
    role,
    displayName,
    email: normalizedEmail,
    photoUrl: credential.user.photoURL,
  });

  await ensureTutorClaim(credential.user, role);
  await establishAuthSession(credential.user);

  return credential.user;
}

export async function signUpWithGoogle(role: SignupRole): Promise<User> {
  await requireFirebaseApp();
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const existingDoc = await getDoc(doc(db, "users", user.uid));
  if (existingDoc.exists()) {
    throw new Error("Conta já existente. Faça login para continuar.");
  }

  const email = await resolveSignupEmail(user);

  await createUserDocument(user.uid, {
    role,
    displayName: user.displayName ?? "Usuário",
    email,
    photoUrl: user.photoURL,
  });

  await ensureTutorClaim(user, role);
  await establishAuthSession(user);

  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await requireFirebaseApp();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await establishAuthSession(credential.user);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  await requireFirebaseApp();
  const result = await signInWithPopup(auth, googleProvider);
  await establishAuthSession(result.user);
  return result.user;
}

export async function completeGoogleSignup(role: SignupRole): Promise<User> {
  await requireFirebaseApp();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Faça login com Google para continuar.");
  }

  const existingDoc = await getDoc(doc(db, "users", user.uid));
  if (existingDoc.exists()) {
    await ensureTutorClaim(user, role);
    await establishAuthSession(user);
    return user;
  }

  const email = await resolveSignupEmail(user);

  await createUserDocument(user.uid, {
    role,
    displayName: user.displayName ?? "Usuário",
    email,
    photoUrl: user.photoURL,
  });

  await ensureTutorClaim(user, role);
  await establishAuthSession(user);

  return user;
}

export async function signOut(): Promise<void> {
  await requireFirebaseApp();
  await clearAuthSession();
  await firebaseSignOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await requireFirebaseApp();
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Informe o e-mail da sua conta.");
  }
  await sendPasswordResetEmail(auth, normalized);
}
