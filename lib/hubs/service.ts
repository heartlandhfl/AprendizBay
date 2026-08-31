import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, ensureFirebaseApp, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import {
  createHubJoinError,
  evaluateHubJoin,
  hubJoinWrite,
  type HubJoinErrorCode,
} from "@/lib/hubs/join";
import { toPublicCollectiveHub } from "@/lib/hubs/public";
import { requestNotification } from "@/lib/notifications/client";
import { loadPlatformFeePercent, splitBookingPrice } from "@/lib/payments/fees";
import { getTutorProfile } from "@/lib/tutor-profiles";
import type { FirestoreCollectiveHubDoc } from "@/lib/tutors/firestore-types";
import { mapFirestoreCollectiveHubDoc } from "@/lib/tutors/map";
import type {
  CollectiveHubLive,
  CreateCollectiveHubInput,
  JoinCollectiveClassInput,
} from "@/lib/hubs/types";

function mapLiveHub(
  id: string,
  data: FirestoreCollectiveHubDoc,
  viewerId?: string,
): CollectiveHubLive {
  const publicHub = toPublicCollectiveHub(id, data as Record<string, unknown>, viewerId);
  const hub = mapFirestoreCollectiveHubDoc(id, data);

  return {
    ...hub,
    tutorId: publicHub.tutorId,
    status: publicHub.status,
    subject: publicHub.subject || hub.subject,
    tutorName: publicHub.tutorName || hub.tutorName,
    scheduledDate: publicHub.scheduledDate || hub.scheduledDate,
    startTime: publicHub.startTime || hub.startTime,
    individualPrice: publicHub.individualPrice || hub.individualPrice,
    isJoined: publicHub.isJoined,
  };
}

function throwJoinError(code: HubJoinErrorCode): never {
  throw createHubJoinError(code);
}

function getMockOpenHubs(): CollectiveHubLive[] {
  return ["1", "2", "3", "4", "5"].flatMap((tutorId) => {
    const profile = getTutorProfile(tutorId);
    if (!profile) {
      return [];
    }

    return profile.collectiveHubs
      .filter((hub) => hub.confirmedStudents < hub.maxStudents)
      .map((hub) => ({
        ...hub,
        subject: hub.subject || profile.subject,
        tutorName: hub.tutorName || profile.name,
        individualPrice: hub.individualPrice || profile.individualPrice,
        tutorId: profile.id,
        status: "open",
        isJoined: false,
      }));
  });
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
    confirmedStudentCount: 0,
    currentPrice: input.currentPrice,
    fullPrice: input.fullPrice,
    schedule: input.schedule.trim(),
    modality: input.modality,
    status: "open",
    subject: input.subject.trim(),
    scheduledDate: input.scheduledDate,
    startTime: input.startTime,
    tutorName: input.tutorName.trim(),
    individualPrice: input.individualPrice,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function joinCollectiveHub(hubId: string, studentId: string): Promise<void> {
  await requireFirebaseApp();
  const hubRef = doc(db, "collectiveHubs", hubId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(hubRef);
    if (!snapshot.exists()) {
      throwJoinError("not_found");
    }

    const decision = evaluateHubJoin(snapshot.data() as FirestoreCollectiveHubDoc, studentId);
    if (!decision.ok) {
      throwJoinError(decision.code);
    }

    transaction.update(hubRef, hubJoinWrite(decision, serverTimestamp()));
  });
}

export async function joinCollectiveClassAndBook(
  studentId: string,
  input: JoinCollectiveClassInput,
): Promise<string> {
  await requireFirebaseApp();
  const hubRef = doc(db, "collectiveHubs", input.hubId);
  const bookingRef = doc(collection(db, "bookings"));
  const feeSplit = splitBookingPrice(input.price, await loadPlatformFeePercent());

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(hubRef);
    if (!snapshot.exists()) {
      throwJoinError("not_found");
    }

    const data = snapshot.data() as FirestoreCollectiveHubDoc;
    if (data.tutorId !== input.tutorId) {
      throwJoinError("not_found");
    }

    const decision = evaluateHubJoin(data, studentId);
    if (!decision.ok) {
      throwJoinError(decision.code);
    }

    transaction.update(hubRef, hubJoinWrite(decision, serverTimestamp()));
    transaction.set(bookingRef, {
      studentId,
      tutorId: input.tutorId,
      type: "coletivo",
      status: "pending",
      paymentStatus: "unpaid",
      price: input.price,
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
      scheduledAt: Timestamp.fromDate(input.scheduledAt),
      createdAt: serverTimestamp(),
      hubId: input.hubId,
    });
  });

  void requestNotification({ type: "pending_booking", bookingId: bookingRef.id });
  return bookingRef.id;
}

export async function fetchOpenCollectiveHubs(): Promise<CollectiveHubLive[]> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return getMockOpenHubs();
  }

  const snapshot = await getDocs(
    query(collection(db, "collectiveHubs"), where("status", "==", "open")),
  );

  if (snapshot.empty) {
    const anyHubs = await getDocs(collection(db, "collectiveHubs"));
    if (anyHubs.empty) {
      return getMockOpenHubs();
    }
    return [];
  }

  return snapshot.docs
    .map((docSnap) =>
      mapLiveHub(docSnap.id, docSnap.data() as FirestoreCollectiveHubDoc),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export async function fetchCollectiveHubById(
  hubId: string,
  viewerId?: string,
): Promise<CollectiveHubLive | null> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return getMockOpenHubs().find((hub) => hub.id === hubId) ?? null;
  }

  const snapshot = await getDoc(doc(db, "collectiveHubs", hubId));
  if (!snapshot.exists()) {
    return getMockOpenHubs().find((hub) => hub.id === hubId) ?? null;
  }

  return mapLiveHub(snapshot.id, snapshot.data() as FirestoreCollectiveHubDoc, viewerId);
}

export async function fetchHub(hubId: string): Promise<CollectiveHubLive | null> {
  return fetchCollectiveHubById(hubId);
}

export function subscribeToTutorCollectiveHubs(
  tutorId: string,
  onChange: (hubs: CollectiveHubLive[]) => void,
  onError?: (error: Error) => void,
  viewerId?: string,
): Unsubscribe {
  return whenFirebaseReady(
    () => {
      const hubsQuery = query(
        collection(db, "collectiveHubs"),
        where("tutorId", "==", tutorId),
        where("status", "in", ["open", "full"]),
      );

      return onSnapshot(
        hubsQuery,
        (snapshot) => {
          const hubs = snapshot.docs
            .map((docSnap) =>
              mapLiveHub(
                docSnap.id,
                docSnap.data() as FirestoreCollectiveHubDoc,
                viewerId,
              ),
            )
            .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

          onChange(hubs);
        },
        (error) => onError?.(error),
      );
    },
    () => onChange([]),
  );
}

export function formatHubPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export { formatVacancyLabel, collectiveSavingsPercent } from "@/lib/hubs/public";
