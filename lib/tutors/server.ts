/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * Used at `npm run build` by app/tutor/[id]/page.tsx and
 * app/professores/[materia]/[cidade]/page.tsx (SSG: generateStaticParams,
 * generateMetadata, prerender) plus app/sitemap.ts. Bundled into
 * hostinger-next/server/app/** for Next.js RSC, but Express never executes
 * those chunks — serve-static-ui.js only streams the committed .html / .body files.
 *
 * Not imported by server.js or server/api/. Production Express must not require this module.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Tutor } from "@/lib/mock-tutors";
import type { TutorProfile } from "@/lib/tutor-profiles";
import {
  allowMockTutorFallback,
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
import { isEligibleForSearch } from "@/lib/tutors/search";

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

export interface FetchTutorsServerOptions {
  /** When false, never substitute MOCK_TUTORS (sitemap, static params). */
  allowMockFallback?: boolean;
}

function resolveMockFallback(options?: FetchTutorsServerOptions): boolean {
  return options?.allowMockFallback ?? allowMockTutorFallback();
}

export async function fetchVerifiedTutorsServer(
  options?: FetchTutorsServerOptions,
): Promise<Tutor[]> {
  const useMocks = resolveMockFallback(options);
  const db = getAdminFirestore();
  if (!db) {
    return useMocks ? getMockTutorsForFallback() : [];
  }

  try {
    const snapshot = await db.collection("tutors").where("isVerified", "==", true).get();

    if (snapshot.empty) {
      if (useMocks && (await isTutorsCollectionEmpty(db))) {
        return getMockTutorsForFallback();
      }
      return [];
    }

    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as FirestoreTutorDoc;
        if (!isEligibleForSearch(data)) {
          return null;
        }
        return mapFirestoreTutorDoc(docSnap.id, data);
      })
      .filter((tutor): tutor is Tutor => tutor !== null)
      .sort((a, b) => b.rating - a.rating);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar tutores no Firestore:", error);
    return useMocks ? getMockTutorsForFallback() : [];
  }
}

/** Verified tutors for sitemap and SSG. Never returns demo/mock profiles. */
export async function fetchIndexableTutorsForSeo(): Promise<Tutor[]> {
  return fetchVerifiedTutorsServer({ allowMockFallback: false });
}

export async function fetchTutorProfile(
  id: string,
  options?: FetchTutorsServerOptions,
): Promise<TutorProfile | undefined> {
  const useMocks = resolveMockFallback(options);
  const db = getAdminFirestore();
  if (!db) {
    return useMocks ? getMockTutorProfileForFallback(id) : undefined;
  }

  try {
    if (useMocks && (await isTutorsCollectionEmpty(db))) {
      return getMockTutorProfileForFallback(id);
    }

    const tutorSnap = await db.collection("tutors").doc(id).get();
    if (!tutorSnap.exists) {
      return undefined;
    }

    const tutorData = tutorSnap.data() as FirestoreTutorDoc;
    if (!isEligibleForSearch(tutorData)) {
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
      tutorData,
      collectiveHubs,
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar perfil do tutor:", error);
    if (!useMocks) {
      return undefined;
    }
    warnMockTutorFallback();
    return getMockTutorProfileForFallback(id);
  }
}

export async function fetchAllTutorIds(
  options?: FetchTutorsServerOptions,
): Promise<string[]> {
  const useMocks = resolveMockFallback(options);
  const db = getAdminFirestore();
  if (!db) {
    return useMocks ? getMockTutorsForFallback().map((tutor) => tutor.id) : [];
  }

  try {
    if (useMocks && (await isTutorsCollectionEmpty(db))) {
      return getMockTutorsForFallback().map((tutor) => tutor.id);
    }

    const snapshot = await db.collection("tutors").where("isVerified", "==", true).get();
    return snapshot.docs
      .filter((docSnap) => isEligibleForSearch(docSnap.data() as FirestoreTutorDoc))
      .map((docSnap) => docSnap.id);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao listar IDs de tutores:", error);
    return useMocks ? getMockTutorsForFallback().map((tutor) => tutor.id) : [];
  }
}

/** Public tutor IDs for sitemap and SSG. Never includes demo/mock profiles. */
export async function fetchIndexableTutorIdsForSeo(): Promise<string[]> {
  return fetchAllTutorIds({ allowMockFallback: false });
}
