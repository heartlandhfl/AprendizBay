import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, requireFirebaseApp } from "@/lib/firebase/client";
import { resolvePostAuthDestination } from "@/lib/auth/redirects";
import type { UserDoc } from "@/lib/auth/types";
import { isLecturerRole, isStudentRole } from "@/lib/auth/roles";
import { readTokenRole, resolveAuthoritativeRole } from "@/lib/auth/token-role";
import { fetchStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import { writeOwnPublicProfile } from "@/lib/users/public-profile";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

async function fetchTutorDoc(userId: string): Promise<FirestoreTutorDoc | null> {
  const snapshot = await getDoc(doc(db, "tutors", userId));
  return snapshot.exists() ? (snapshot.data() as FirestoreTutorDoc) : null;
}

export async function resolveLoginDestination(
  user: User,
  requestedPath?: string | null,
): Promise<string> {
  await requireFirebaseApp();
  const userSnapshot = await getDoc(doc(db, "users", user.uid));

  if (!userSnapshot.exists()) {
    return "/signup";
  }

  const userDoc = userSnapshot.data() as UserDoc;
  const tokenRole = await readTokenRole(user, true);
  const role = resolveAuthoritativeRole(userDoc.role, tokenRole) ?? userDoc.role;
  const learningProfile = isStudentRole(role)
    ? await fetchStudentLearningProfile(user.uid)
    : null;
  const tutorDoc = isLecturerRole(role) ? await fetchTutorDoc(user.uid) : null;

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
