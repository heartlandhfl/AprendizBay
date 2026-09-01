import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { auth, db, requireFirebaseApp } from "@/lib/firebase/client";

export const PUBLIC_PROFILE_COLLECTION = "public";
export const PUBLIC_PROFILE_DOC_ID = "profile";
export const PUBLIC_DISPLAY_NAME_FALLBACK = "Usuário";
export const CLOSED_ACCOUNT_DISPLAY_NAME = "Conta encerrada";

export interface PublicUserProfile {
  displayName: string;
  photoUrl?: string | null;
}

export function userPublicProfileRef(firestore: Firestore, userId: string) {
  return doc(
    firestore,
    "users",
    userId,
    PUBLIC_PROFILE_COLLECTION,
    PUBLIC_PROFILE_DOC_ID,
  );
}

export function publicProfilePayload(input: PublicUserProfile) {
  const displayName = input.displayName.trim() || PUBLIC_DISPLAY_NAME_FALLBACK;

  return {
    displayName,
    photoUrl: input.photoUrl ?? null,
    updatedAt: serverTimestamp(),
  };
}

export async function writeOwnPublicProfile(
  userId: string,
  input: PublicUserProfile,
): Promise<void> {
  await requireFirebaseApp();
  await setDoc(userPublicProfileRef(db, userId), publicProfilePayload(input), {
    merge: true,
  });
}

export async function ensureOwnPublicProfile(
  userId: string,
  input: PublicUserProfile,
): Promise<void> {
  await requireFirebaseApp();
  const ref = userPublicProfileRef(db, userId);
  const snapshot = await getDoc(ref);
  const desiredName = input.displayName.trim() || PUBLIC_DISPLAY_NAME_FALLBACK;
  const desiredPhoto = input.photoUrl ?? null;

  if (snapshot.exists()) {
    const data = snapshot.data();
    const currentName =
      typeof data.displayName === "string" ? data.displayName : "";
    const currentPhoto = data.photoUrl ?? null;
    if (currentName === desiredName && currentPhoto === desiredPhoto) {
      return;
    }
  }

  await setDoc(ref, publicProfilePayload(input), { merge: true });
}

function readDisplayName(data: Record<string, unknown> | undefined): string {
  if (typeof data?.displayName === "string" && data.displayName.trim()) {
    return data.displayName.trim();
  }
  return PUBLIC_DISPLAY_NAME_FALLBACK;
}

async function fetchPublicDisplayNameFromApi(userId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    return PUBLIC_DISPLAY_NAME_FALLBACK;
  }

  const idToken = await user.getIdToken();
  const response = await fetch(
    `/api/users/public-profile/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );

  if (response.status === 404) {
    return CLOSED_ACCOUNT_DISPLAY_NAME;
  }

  const payload = (await response.json().catch(() => null)) as {
    displayName?: unknown;
  } | null;

  if (!response.ok) {
    return PUBLIC_DISPLAY_NAME_FALLBACK;
  }

  return typeof payload?.displayName === "string" && payload.displayName.trim()
    ? payload.displayName.trim()
    : PUBLIC_DISPLAY_NAME_FALLBACK;
}

export async function fetchPublicDisplayName(userId: string): Promise<string> {
  await requireFirebaseApp();
  const snapshot = await getDoc(userPublicProfileRef(db, userId));
  if (snapshot.exists()) {
    return readDisplayName(snapshot.data() as Record<string, unknown>);
  }

  return fetchPublicDisplayNameFromApi(userId);
}
