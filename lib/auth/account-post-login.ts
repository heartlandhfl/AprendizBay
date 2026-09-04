import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, requireFirebaseApp } from "@/lib/firebase/client";
import { resolvePostAuthDestination } from "@/lib/auth/redirects";
import type { UserDoc } from "@/lib/auth/types";
import { isLecturerRole, isStudentRole } from "@/lib/auth/roles";
import { fetchStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import { writeOwnPublicProfile } from "@/lib/users/public-profile";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

async function fetchTutorDoc(userId: string): Promise<FirestoreTutorDoc | null> {
  const snapshot = await getDoc(doc(db, "tutors", userId));
  return snapshot.exists() ? (snapshot.data() as FirestoreTutorDoc) : null;
}

export async function resolveLoginDestination(
  userId: string,
  requestedPath?: string | null,
): Promise<string> {
  await requireFirebaseApp();
  const userSnapshot = await getDoc(doc(db, "users", userId));

  if (!userSnapshot.exists()) {
    return "/signup";
  }

  const userDoc = userSnapshot.data() as UserDoc;
  const role = userDoc.role;
  const learningProfile = isStudentRole(role)
    ? await fetchStudentLearningProfile(userId)
    : null;
  const tutorDoc = isLecturerRole(role) ? await fetchTutorDoc(userId) : null;

  return resolvePostAuthDestination({
    role,
    userDoc,
    learningProfile,
    tutorDoc,
    requestedPath,
  });
}

export async function updateStudentAccountBasics(input: {
  userId: string;
  displayName: string;
  photoUrl?: string | null;
}): Promise<void> {
  await requireFirebaseApp();

  await updateDoc(doc(db, "users", input.userId), {
    displayName: input.displayName.trim(),
    ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeOwnPublicProfile(input.userId, {
    displayName: input.displayName,
    photoUrl: input.photoUrl ?? null,
  });
}
