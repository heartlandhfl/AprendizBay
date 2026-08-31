import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { Modality } from "@/lib/mock-tutors";
import { db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

export interface CreateTutorProfileInput {
  name: string;
  subject: string;
  city: string;
  state: string;
  bio: string;
  individualPrice: number;
  collectivePrice: number;
  modality: Modality;
  avatarUrl?: string;
  credentialFileName?: string;
}

export async function getTutorProfile(tutorId: string): Promise<FirestoreTutorDoc | null> {
  await requireFirebaseApp();
  const snapshot = await getDoc(doc(db, "tutors", tutorId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as FirestoreTutorDoc;
}

export async function tutorProfileExists(tutorId: string): Promise<boolean> {
  const profile = await getTutorProfile(tutorId);
  return profile !== null;
}

export function subscribeToTutorProfile(
  tutorId: string,
  onChange: (profile: FirestoreTutorDoc | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const tutorRef = doc(db, "tutors", tutorId);

    return onSnapshot(
      tutorRef,
      (snapshot) => {
        onChange(snapshot.exists() ? (snapshot.data() as FirestoreTutorDoc) : null);
      },
      (error) => onError?.(error),
    );
  });
}

export async function createTutorProfile(
  tutorId: string,
  input: CreateTutorProfileInput,
): Promise<void> {
  await requireFirebaseApp();

  await setDoc(doc(db, "tutors", tutorId), {
    userId: tutorId,
    name: input.name.trim(),
    subject: input.subject.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    bio: input.bio.trim(),
    individualPrice: input.individualPrice,
    collectivePrice: input.collectivePrice,
    modality: input.modality,
    isVerified: false,
    verificationStatus: "pending",
    isOnline: false,
    rating: 0,
    reviewCount: 0,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    ...(input.credentialFileName ? { credentialFileName: input.credentialFileName } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export interface UpdateTutorProfileInput {
  avatarUrl?: string;
  credentialFileName?: string;
}

export async function updateTutorProfile(
  tutorId: string,
  input: UpdateTutorProfileInput,
): Promise<void> {
  await requireFirebaseApp();

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.avatarUrl !== undefined) {
    updates.avatarUrl = input.avatarUrl;
  }

  if (input.credentialFileName !== undefined) {
    updates.credentialFileName = input.credentialFileName;
  }

  await updateDoc(doc(db, "tutors", tutorId), updates);
}
