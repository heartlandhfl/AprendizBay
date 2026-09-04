import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { db, whenFirebaseReady } from "@/lib/firebase/client";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

const PROFILE_DOC_ID = "profile";

function mapLearningProfile(data: Record<string, unknown> | undefined): StudentLearningProfile {
  if (!data) {
    return {};
  }

  return {
    preferredSubject:
      typeof data.preferredSubject === "string" ? data.preferredSubject : undefined,
    preferredLevel:
      typeof data.preferredLevel === "string" ? data.preferredLevel : undefined,
    preferredModality:
      data.preferredModality === "online" ||
      data.preferredModality === "presencial" ||
      data.preferredModality === "ambos"
        ? data.preferredModality
        : undefined,
    preferredCity:
      typeof data.preferredCity === "string" ? data.preferredCity : undefined,
  };
}

export function subscribeToStudentLearningProfile(
  studentId: string,
  onChange: (profile: StudentLearningProfile) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const profileRef = doc(db, "users", studentId, "learning", PROFILE_DOC_ID);

    return onSnapshot(
      profileRef,
      (snapshot) => {
        onChange(
          snapshot.exists()
            ? mapLearningProfile(snapshot.data() as Record<string, unknown>)
            : {},
        );
      },
      (error) => onError?.(error),
    );
  });
}

export async function fetchStudentLearningProfile(
  studentId: string,
): Promise<StudentLearningProfile> {
  const snapshot = await getDoc(doc(db, "users", studentId, "learning", PROFILE_DOC_ID));
  return snapshot.exists()
    ? mapLearningProfile(snapshot.data() as Record<string, unknown>)
    : {};
}

export async function saveStudentLearningProfile(
  studentId: string,
  profile: StudentLearningProfile,
): Promise<void> {
  await setDoc(
    doc(db, "users", studentId, "learning", PROFILE_DOC_ID),
    {
      preferredSubject: profile.preferredSubject?.trim() || null,
      preferredLevel: profile.preferredLevel?.trim() || null,
      preferredModality: profile.preferredModality || null,
      preferredCity: profile.preferredCity?.trim() || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
