import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import type { FirestoreCollectiveHubDoc } from "@/lib/tutors/firestore-types";
import { mapFirestoreCollectiveHubDoc } from "@/lib/tutors/map";
import type {
  CollectiveHubLive,
  CreateCollectiveHubInput,
} from "@/lib/hubs/types";

function mapHubDoc(id: string, data: FirestoreCollectiveHubDoc): CollectiveHubLive {
  const hub = mapFirestoreCollectiveHubDoc(id, data);

  return {
    ...hub,
    tutorId: data.tutorId,
    confirmedStudentIds: data.confirmedStudentIds ?? [],
    status: data.status,
  };
}

export async function createCollectiveHub(
  tutorId: string,
  input: CreateCollectiveHubInput,
): Promise<string> {
  await requireFirebaseApp();
  const docRef = await addDoc(collection(db, "collectiveHubs"), {
    tutorId,
    title: input.title.trim(),
    description: input.description.trim(),
    maxStudents: input.maxStudents,
    confirmedStudentIds: [],
    currentPrice: input.currentPrice,
    fullPrice: input.fullPrice,
    schedule: input.schedule.trim(),
    modality: input.modality,
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function fetchHub(hubId: string): Promise<CollectiveHubLive | null> {
  await requireFirebaseApp();
  const snapshot = await getDoc(doc(db, "collectiveHubs", hubId));
  if (!snapshot.exists()) {
    return null;
  }

  return mapHubDoc(snapshot.id, snapshot.data() as FirestoreCollectiveHubDoc);
}

export async function joinCollectiveHub(hubId: string, studentId: string): Promise<void> {
  await requireFirebaseApp();
  await updateDoc(doc(db, "collectiveHubs", hubId), {
    confirmedStudentIds: arrayUnion(studentId),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToTutorCollectiveHubs(
  tutorId: string,
  onChange: (hubs: CollectiveHubLive[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const hubsQuery = query(
      collection(db, "collectiveHubs"),
      where("tutorId", "==", tutorId),
      where("status", "==", "open"),
    );

    return onSnapshot(
      hubsQuery,
      (snapshot) => {
        const hubs = snapshot.docs
          .map((docSnap) =>
            mapHubDoc(docSnap.id, docSnap.data() as FirestoreCollectiveHubDoc),
          )
          .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

        onChange(hubs);
      },
      (error) => onError?.(error),
    );
  });
}

export function formatHubPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
