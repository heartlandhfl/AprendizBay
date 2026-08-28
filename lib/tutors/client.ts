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
import type { FirestoreTutorDoc, TutorQueryFilters } from "@/lib/tutors/firestore-types";
import { mapFirestoreTutorDoc } from "@/lib/tutors/map";

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

  const tutors = snapshot.docs.map((docSnap) =>
    mapFirestoreTutorDoc(docSnap.id, docSnap.data() as FirestoreTutorDoc),
  );

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
