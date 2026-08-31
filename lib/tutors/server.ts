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
  okTutorList,
  resolveFailedTutorCatalog,
  resolveFailedTutorProfile,
  type TutorListResult,
  type TutorProfileResult,
} from "@/lib/tutors/catalog";
import {
  getMockTutorProfileForFallback,
  getMockTutorsForFallback,
} from "@/lib/tutors/fallback";
import type { FirestoreCollectiveHubDoc, FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import {
  mapFirestoreCollectiveHubDoc,
  mapFirestoreTutorDoc,
  mapFirestoreTutorProfile,
} from "@/lib/tutors/map";
import { areMockTutorsEnabled } from "@/lib/tutors/mock-gate";
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

function mockCatalogFallback(failure: "unavailable" | "error"): TutorListResult<Tutor> {
  return resolveFailedTutorCatalog(failure, {
    mocksEnabled: areMockTutorsEnabled(),
    mockItems: getMockTutorsForFallback(),
  });
}

function mockProfileFallback(
  id: string,
  failure: "unavailable" | "error",
): TutorProfileResult<TutorProfile> {
  return resolveFailedTutorProfile(failure, {
    mocksEnabled: areMockTutorsEnabled(),
    mockTutor: getMockTutorProfileForFallback(id),
  });
}

async function isTutorsCollectionEmpty(db: Firestore): Promise<boolean> {
  const snapshot = await db.collection("tutors").limit(1).get();
  return snapshot.empty;
}

export async function fetchVerifiedTutorsServer(): Promise<TutorListResult<Tutor>> {
  const db = getAdminFirestore();
  if (!db) {
    return mockCatalogFallback("unavailable");
  }

  try {
    const snapshot = await db.collection("tutors").where("isVerified", "==", true).get();

    if (snapshot.empty) {
      if ((await isTutorsCollectionEmpty(db)) && areMockTutorsEnabled()) {
        return okTutorList(getMockTutorsForFallback());
      }
      return okTutorList([]);
    }

    const tutors = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as FirestoreTutorDoc;
        if (!isEligibleForSearch(data)) {
          return null;
        }
        return mapFirestoreTutorDoc(docSnap.id, data);
      })
      .filter((tutor): tutor is Tutor => tutor !== null)
      .sort((a, b) => b.rating - a.rating);

    return okTutorList(tutors);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar tutores no Firestore:", error);
    return mockCatalogFallback("error");
  }
}

export async function fetchTutorProfile(
  id: string,
): Promise<TutorProfileResult<TutorProfile>> {
  const db = getAdminFirestore();
  if (!db) {
    return mockProfileFallback(id, "unavailable");
  }

  try {
    if (await isTutorsCollectionEmpty(db)) {
      if (areMockTutorsEnabled()) {
        const mockTutor = getMockTutorProfileForFallback(id);
        if (mockTutor) {
          return { state: "ok", tutor: mockTutor };
        }
      }
      return { state: "not_found" };
    }

    const tutorSnap = await db.collection("tutors").doc(id).get();
    if (!tutorSnap.exists) {
      return { state: "not_found" };
    }

    const tutorData = tutorSnap.data() as FirestoreTutorDoc;
    if (!isEligibleForSearch(tutorData)) {
      return { state: "not_found" };
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

    return {
      state: "ok",
      tutor: mapFirestoreTutorProfile(tutorSnap.id, tutorData, collectiveHubs),
    };
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar perfil do tutor:", error);
    return mockProfileFallback(id, "error");
  }
}

export async function fetchAllTutorIds(): Promise<TutorListResult<string>> {
  const db = getAdminFirestore();
  if (!db) {
    return resolveFailedTutorCatalog("unavailable", {
      mocksEnabled: areMockTutorsEnabled(),
      mockItems: getMockTutorsForFallback().map((tutor) => tutor.id),
    });
  }

  try {
    if (await isTutorsCollectionEmpty(db)) {
      if (areMockTutorsEnabled()) {
        return okTutorList(getMockTutorsForFallback().map((tutor) => tutor.id));
      }
      return okTutorList([]);
    }

    const snapshot = await db.collection("tutors").where("isVerified", "==", true).get();
    const ids = snapshot.docs
      .filter((docSnap) => isEligibleForSearch(docSnap.data() as FirestoreTutorDoc))
      .map((docSnap) => docSnap.id);

    return okTutorList(ids);
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao listar IDs de tutores:", error);
    return resolveFailedTutorCatalog("error", {
      mocksEnabled: areMockTutorsEnabled(),
      mockItems: getMockTutorsForFallback().map((tutor) => tutor.id),
    });
  }
}
