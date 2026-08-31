import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import type { Tutor } from "@/lib/mock-tutors";
import { db, ensureFirebaseApp } from "@/lib/firebase/client";
import { getMockTutorsForFallback, warnMockTutorFallback } from "@/lib/tutors/fallback";
import type {
  AdminTutorApplication,
  FirestoreTutorDoc,
  TutorQueryFilters,
} from "@/lib/tutors/firestore-types";
import { mapAdminTutorApplication, mapFirestoreTutorDoc } from "@/lib/tutors/map";
import { isMarketplaceVisible } from "@/lib/tutors/verification";

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
    }));
}

export async function fetchVerifiedTutors(filters: TutorQueryFilters = {}): Promise<Tutor[]> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return filterByModality(getMockTutorsForFallback(), filters.modality);
  }

  const constraints: QueryConstraint[] = [where("isVerified", "==", true)];

  if (filters.subject && filters.subject !== "Todas as matérias") {
    constraints.push(where("subject", "==", filters.subject));
  }

  if (filters.city) {
    constraints.push(where("city", "==", filters.city));
  }

  const snapshot = await getDocs(query(collection(db, "tutors"), ...constraints));

  if (snapshot.empty) {
    const hasAnyTutors = await tutorsCollectionIsEmpty();
    if (hasAnyTutors) {
      return [];
    }

    warnMockTutorFallback();
    return filterByModality(getMockTutorsForFallback(), filters.modality);
  }

  const tutors = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as FirestoreTutorDoc;
      if (!isMarketplaceVisible(data)) {
        return null;
      }
      return mapFirestoreTutorDoc(docSnap.id, data);
    })
    .filter((tutor): tutor is Tutor => tutor !== null);

  return filterByModality(tutors, filters.modality).sort((a, b) => b.rating - a.rating);
}

function filterByModality(tutors: Tutor[], modality: TutorQueryFilters["modality"]) {
  if (!modality || modality === "todos") {
    return tutors;
  }

  return tutors.filter(
    (tutor) => tutor.modality === modality || tutor.modality === "ambos",
  );
}

async function tutorsCollectionIsEmpty(): Promise<boolean> {
  const allTutors = await getDocs(collection(db, "tutors"));
  return allTutors.empty;
}
