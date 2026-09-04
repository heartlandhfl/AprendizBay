import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import type { Tutor } from "@/lib/mock-tutors";
import { db, ensureFirebaseApp } from "@/lib/firebase/client";
import {
  failedTutorList,
  okTutorList,
  resolveFailedTutorCatalog,
  type TutorListResult,
} from "@/lib/tutors/catalog";
import { rejectMockTutorInventory } from "@/lib/tutors/mock-identities";
import { areMockTutorsEnabled } from "@/lib/tutors/mock-gate";
import type {
  AdminTutorApplication,
  FirestoreTutorDoc,
  TutorQueryFilters,
} from "@/lib/tutors/firestore-types";
import { mapAdminTutorApplication, mapFirestoreTutorDoc } from "@/lib/tutors/map";
import {
  SEARCH_RESULT_LIMIT,
  firestoreSearchConstraints,
  isEligibleForSearch,
} from "@/lib/tutors/search";

async function catalogWhenFirebaseMissing(
  failure: "unavailable" | "error",
): Promise<TutorListResult<Tutor>> {
  if (process.env.NODE_ENV === "production") {
    return failedTutorList(failure);
  }

  const { getMockTutorsForFallback } = await import("./fallback");
  return resolveFailedTutorCatalog(failure, {
    mocksEnabled: areMockTutorsEnabled(),
    mockItems: (await getMockTutorsForFallback()).filter((tutor) => tutor.isVerified !== false),
  });
}

export async function fetchAdminTutorApplications(): Promise<AdminTutorApplication[]> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return [];
  }

  const snapshot = await getDocs(collection(db, "tutors"));

  return snapshot.docs
    .map((docSnap) =>
      mapAdminTutorApplication(docSnap.id, docSnap.data() as FirestoreTutorDoc),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** @deprecated Use fetchAdminTutorApplications. Kept for callers that only need unverified rows. */
export async function fetchUnverifiedTutors(): Promise<Tutor[]> {
  const applications = await fetchAdminTutorApplications();
  return applications
    .filter((tutor) => !tutor.isVerified)
    .map((tutor) => ({
      id: tutor.id,
      name: tutor.name,
      subject: tutor.subject,
      city: tutor.city,
      state: tutor.state,
      rating: 0,
      reviewCount: 0,
      bio: tutor.bio,
      individualPrice: tutor.individualPrice,
      collectivePrice: tutor.collectivePrice,
      modality: tutor.modality,
      lessonTypes: ["individual", "coletivo"],
      isOnline: false,
      avatarUrl: tutor.avatarUrl,
      avatarColor: "bg-emerald-100",
      isVerified: false,
    }));
}

export async function fetchVerifiedTutors(
  filters: TutorQueryFilters = {},
): Promise<TutorListResult<Tutor>> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return catalogWhenFirebaseMissing("unavailable");
  }

  try {
    const { subject, city, modality, availableOnly } = firestoreSearchConstraints(filters);
    const constraints: QueryConstraint[] = [where("isVerified", "==", true)];

    if (subject) {
      constraints.push(where("subject", "==", subject));
    }

    if (city) {
      constraints.push(where("city", "==", city));
    }

    if (modality === "online") {
      constraints.push(where("modality", "in", ["online", "ambos"]));
    } else if (modality === "presencial") {
      constraints.push(where("modality", "in", ["presencial", "ambos"]));
    }

    if (availableOnly) {
      constraints.push(where("hasAvailability", "==", true));
    }

    constraints.push(orderBy("rating", "desc"));
    constraints.push(limit(SEARCH_RESULT_LIMIT));

    const snapshot = await getDocs(query(collection(db, "tutors"), ...constraints));

    const tutors = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as FirestoreTutorDoc;
        if (!isEligibleForSearch(data)) {
          return null;
        }
        return mapFirestoreTutorDoc(docSnap.id, data);
      })
      .filter((tutor): tutor is Tutor => tutor !== null);

    return okTutorList(rejectMockTutorInventory(tutors));
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar tutores no Firestore:", error);
    return catalogWhenFirebaseMissing("error");
  }
}
