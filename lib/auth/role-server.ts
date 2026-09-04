/**
 * Server-side role management using Firebase Auth custom claims.
 * Never import this module from client components.
 */
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  type CanonicalRole,
  isCanonicalRole,
  isPrivilegedRole,
  normalizeRole,
  profileRoleForCanonical,
  type ProfileRole,
} from "@/lib/auth/roles";

export type { CanonicalRole, ProfileRole };

type RoleClaims = { role?: unknown } | null | undefined;

export function roleFromDecodedToken(decoded: RoleClaims): CanonicalRole | null {
  const claim = decoded?.role;
  return typeof claim === "string" ? normalizeRole(claim) : null;
}

export async function getRole(uid: string): Promise<CanonicalRole | null> {
  const user = await getAuth(getAdminApp()).getUser(uid);
  return roleFromDecodedToken(user.customClaims);
}

export async function hasRole(uid: string, role: CanonicalRole): Promise<boolean> {
  const current = await getRole(uid);
  return current === role;
}

export async function isAdmin(uid: string): Promise<boolean> {
  return hasRole(uid, "admin");
}

export async function isLecturer(uid: string): Promise<boolean> {
  return hasRole(uid, "lecturer");
}

export async function isFacilitator(uid: string): Promise<boolean> {
  return hasRole(uid, "facilitator");
}

export async function isSupport(uid: string): Promise<boolean> {
  return hasRole(uid, "support");
}

export async function isStudent(uid: string): Promise<boolean> {
  return hasRole(uid, "student");
}

async function syncProfileRole(
  uid: string,
  role: ProfileRole,
  extras: { email?: string; displayName?: string } = {},
): Promise<void> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();

  const payload: Record<string, unknown> = {
    role,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (extras.email) {
    payload.email = extras.email;
  }
  if (extras.displayName) {
    payload.displayName = extras.displayName;
  }

  if (snapshot.exists) {
    await ref.set(payload, { merge: true });
    return;
  }

  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    displayName: extras.displayName ?? "Usuário",
    email: extras.email ?? "",
  });
}

/**
 * Sets the authoritative custom claim and keeps the Firestore profile in sync.
 */
export async function setRole(
  uid: string,
  role: CanonicalRole,
  options: { email?: string; displayName?: string } = {},
): Promise<void> {
  if (!isCanonicalRole(role)) {
    throw new Error(`Papel inválido: ${role}`);
  }

  const auth = getAuth(getAdminApp());
  await auth.setCustomUserClaims(uid, { role });
  await syncProfileRole(uid, profileRoleForCanonical(role), options);
}

/**
 * Removes privileged custom claims and resets the profile role to student.
 */
export async function removeRole(uid: string): Promise<void> {
  const auth = getAuth(getAdminApp());
  await auth.setCustomUserClaims(uid, { role: "student" });
  await syncProfileRole(uid, "student");
}

/**
 * After self-service signup, grants the lecturer claim only when the tutor profile
 * is admin-approved. Profile role alone is not sufficient.
 */
export async function syncSignupRoleFromProfile(uid: string): Promise<CanonicalRole | null> {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    return null;
  }

  const profileRole = typeof snapshot.data()?.role === "string" ? snapshot.data()!.role : null;
  const normalized = normalizeRole(profileRole);

  if (normalized === "lecturer") {
    const tutorSnapshot = await db.collection("tutors").doc(uid).get();
    const tutorData = tutorSnapshot.exists ? tutorSnapshot.data() : null;
    const verificationStatus =
      typeof tutorData?.verificationStatus === "string"
        ? tutorData.verificationStatus
        : tutorData?.isVerified === true
          ? "approved"
          : "pending";

    if (verificationStatus !== "approved") {
      return "lecturer";
    }

    const auth = getAuth(getAdminApp());
    const user = await auth.getUser(uid);
    const existing = roleFromDecodedToken(user.customClaims);
    if (existing !== "lecturer") {
      await setRole(uid, "lecturer", {
        email: typeof snapshot.data()?.email === "string" ? snapshot.data()!.email : user.email,
        displayName:
          typeof snapshot.data()?.displayName === "string"
            ? snapshot.data()!.displayName
            : user.displayName ?? undefined,
      });
    }
    return "lecturer";
  }

  if (normalized === "student") {
    return "student";
  }

  return null;
}

export function assertPrivilegedRoleFromClaims(
  decoded: Pick<DecodedIdToken, "role"> | null | undefined,
  allowed: CanonicalRole | CanonicalRole[],
): CanonicalRole {
  const role = roleFromDecodedToken(decoded);
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];

  if (!role || !allowedList.includes(role)) {
    throw new Error("Acesso negado para este papel.");
  }

  return role;
}

export function assertAdminFromClaims(decoded: RoleClaims): void {
  if (roleFromDecodedToken(decoded) !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }
}

/**
 * Rejects actors whose custom claim is a privileged role other than student.
 * Students typically have no privileged claim; absence of a claim is allowed.
 */
export function assertStudentActor(
  decoded: Pick<DecodedIdToken, "role"> | null | undefined,
): void {
  const claim = roleFromDecodedToken(decoded);
  if (claim && claim !== "student") {
    throw new Error("Apenas alunos podem realizar esta ação.");
  }
}

export function assertLecturerActor(
  decoded: Pick<DecodedIdToken, "role"> | null | undefined,
): void {
  assertPrivilegedRoleFromClaims(decoded, "lecturer");
}

export function isPrivilegedClaimRole(
  role: string | null | undefined,
): role is CanonicalRole {
  return typeof role === "string" && isPrivilegedRole(normalizeRole(role) ?? "");
}
