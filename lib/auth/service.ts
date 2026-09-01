import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
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

const googleProvider = new GoogleAuthProvider();

interface CreateUserDocumentInput {
  role: SignupRole;
  displayName: string;
  email: string;
  photoUrl?: string | null;
}

async function createUserDocument(
  uid: string,
  { role, displayName, email, photoUrl }: CreateUserDocumentInput,
): Promise<void> {
  await requireFirebaseApp();
  await setDoc(doc(db, "users", uid), {
    role,
    displayName,
    email,
    ...(photoUrl ? { photoUrl } : {}),
    createdAt: serverTimestamp(),
  });
  await writeOwnPublicProfile(uid, { displayName, photoUrl });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: SignupRole,
): Promise<User> {
  await requireFirebaseApp();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(credential.user, { displayName });
  await createUserDocument(credential.user.uid, {
    role,
    displayName,
    email: credential.user.email ?? email,
    photoUrl: credential.user.photoURL,
  });

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

  if (!user.email) {
    throw new Error("Não foi possível obter o e-mail da conta Google.");
  }

  await createUserDocument(user.uid, {
    role,
    displayName: user.displayName?.trim() || "Usuário",
    email: user.email,
    photoUrl: user.photoURL,
  });

  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await requireFirebaseApp();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  await requireFirebaseApp();
  const result = await signInWithPopup(auth, googleProvider);
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
    throw new Error("Perfil já cadastrado. Faça login para continuar.");
  }

  if (!user.email) {
    throw new Error("Não foi possível obter o e-mail da conta Google.");
  }

  await createUserDocument(user.uid, {
    role,
    displayName: user.displayName?.trim() || "Usuário",
    email: user.email,
    photoUrl: user.photoURL,
  });

  return user;
}

export async function signOut(): Promise<void> {
  await requireFirebaseApp();
  await firebaseSignOut(auth);
}
