import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Tutor } from "@/lib/mock-tutors";
import type { TutorProfile } from "@/lib/tutor-profiles";
import {
  getMockTutorProfileForFallback,
  getMockTutorsForFallback,
  warnMockTutorFallback,
} from "@/lib/tutors/fallback";
import type { FirestoreCollectiveHubDoc, FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import {
  mapFirestoreCollectiveHubDoc,
  mapFirestoreTutorDoc,
  mapFirestoreTutorProfile,
} from "@/lib/tutors/map";

let adminApp: App | undefined;

function getAdminFirestore(): Firestore | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!adminApp) {
    adminApp =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
  }

  return getFirestore(adminApp);
}

async function isTutorsCollectionEmpty(db: Firestore): Promise<boolean> {
  const snapshot = await db.collection("tutors").limit(1).get();
  return snapshot.empty;
}

export async function fetchVerifiedTutorsServer(): Promise<Tutor[]> {
  const db = getAdminFirestore();
  if (!db) {
    return getMockTutorsForFallback();
  }

  try {
    const snapshot = await db.collection("tutors").where("isVerified", "==", true).get();

    if (snapshot.empty) {
      if (await isTutorsCollectionEmpty(db)) {
        return getMockTutorsForFallback();
      }
      return [];
    }

    return snapshot.docs
      .map((docSnap) =>
        mapFirestoreTutorDoc(docSnap.id, docSnap.data() as FirestoreTutorDoc),
      )
      .sort((a, b) => b.rating - a.rating);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar tutores no Firestore:", error);
    return getMockTutorsForFallback();
  }
}

export async function fetchTutorProfile(id: string): Promise<TutorProfile | undefined> {
  const db = getAdminFirestore();
  if (!db) {
    return getMockTutorProfileForFallback(id);
  }

  try {
    if (await isTutorsCollectionEmpty(db)) {
      return getMockTutorProfileForFallback(id);
    }

    const tutorSnap = await db.collection("tutors").doc(id).get();
    if (!tutorSnap.exists) {
      return undefined;
    }

    const hubsSnap = await db
      .collection("collectiveHubs")
      .where("tutorId", "==", id)
      .where("status", "==", "open")
      .get();

    const collectiveHubs = hubsSnap.docs.map((hubDoc) =>
      mapFirestoreCollectiveHubDoc(
        hubDoc.id,
        hubDoc.data() as FirestoreCollectiveHubDoc,
      ),
    );

    return mapFirestoreTutorProfile(
      tutorSnap.id,
      tutorSnap.data() as FirestoreTutorDoc,
      collectiveHubs,
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar perfil do tutor:", error);
    warnMockTutorFallback();
    return getMockTutorProfileForFallback(id);
  }
}

export async function fetchAllTutorIds(): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db) {
    return getMockTutorsForFallback().map((tutor) => tutor.id);
  }

  try {
    if (await isTutorsCollectionEmpty(db)) {
      return getMockTutorsForFallback().map((tutor) => tutor.id);
    }

    const snapshot = await db.collection("tutors").select().get();
    return snapshot.docs.map((docSnap) => docSnap.id);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao listar IDs de tutores:", error);
    return getMockTutorsForFallback().map((tutor) => tutor.id);
  }
}
