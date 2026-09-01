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
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db, ensureFirebaseApp, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import {
  createHubJoinError,
  evaluateHubJoin,
  hubJoinWrite,
  type HubJoinErrorCode,
} from "@/lib/hubs/join";
import { toPublicCollectiveHub } from "@/lib/hubs/public";
import { requestNotification } from "@/lib/notifications/client";
import {
  okTutorList,
  resolveFailedHubItem,
  resolveFailedHubList,
  type HubItemResult,
  type HubListResult,
} from "@/lib/tutors/catalog";
import { isKnownMockInventoryItem, rejectMockTutorInventory } from "@/lib/tutors/mock-identities";
import { areMockTutorsEnabled, isProductionNodeEnv } from "@/lib/tutors/mock-gate";
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

async function getMockOpenHubs(): Promise<CollectiveHubLive[]> {
  if (!areMockTutorsEnabled() || process.env.NODE_ENV === "production") {
    return [];
  }

  const { getTutorProfile } = await import("../tutor-profiles");

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
  const user = auth.currentUser;
  if (!user || user.uid !== studentId) {
    throwJoinError("unauthorized");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/hubs/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ hubId: input.hubId }),
  });

  const payload = (await response.json().catch(() => null)) as {
    bookingId?: string;
    error?: string;
    code?: string;
  } | null;

  if (!response.ok || !payload?.bookingId) {
    const code = payload?.code;
    if (code === "not_found" || code === "already_joined" || code === "full" || code === "closed" || code === "cancelled" || code === "unauthorized") {
      throwJoinError(code);
    }
    const error = new Error(payload?.error || "Não foi possível entrar nesta turma.") as Error & {
      code?: string;
    };
    error.code = payload?.code;
    throw error;
  }

  void requestNotification({ type: "pending_booking", bookingId: payload.bookingId });
  return payload.bookingId;
}

export async function fetchOpenCollectiveHubs(): Promise<HubListResult<CollectiveHubLive>> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return resolveFailedHubList("unavailable", {
      mocksEnabled: areMockTutorsEnabled(),
      mockItems: await getMockOpenHubs(),
    });
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, "collectiveHubs"), where("status", "==", "open")),
    );

    if (snapshot.empty) {
      const anyHubs = await getDocs(collection(db, "collectiveHubs"));
      if (anyHubs.empty && areMockTutorsEnabled()) {
        return okTutorList(await getMockOpenHubs());
      }
      return okTutorList([]);
    }

    const hubs = snapshot.docs
      .map((docSnap) =>
        mapLiveHub(docSnap.id, docSnap.data() as FirestoreCollectiveHubDoc),
      )
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    return okTutorList(rejectMockTutorInventory(hubs));
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar turmas coletivas:", error);
    return resolveFailedHubList("error", {
      mocksEnabled: areMockTutorsEnabled(),
      mockItems: await getMockOpenHubs(),
    });
  }
}

export async function fetchCollectiveHubById(
  hubId: string,
  viewerId?: string,
): Promise<HubItemResult<CollectiveHubLive>> {
  const app = await ensureFirebaseApp();
  if (!app) {
    return resolveFailedHubItem("unavailable", {
      mocksEnabled: areMockTutorsEnabled(),
      mockHub: (await getMockOpenHubs()).find((hub) => hub.id === hubId) ?? null,
    });
  }

  try {
    const snapshot = await getDoc(doc(db, "collectiveHubs", hubId));
    if (!snapshot.exists()) {
      return { state: "not_found", hub: null };
    }

    const hub = mapLiveHub(snapshot.id, snapshot.data() as FirestoreCollectiveHubDoc, viewerId);
    if (isProductionNodeEnv() && isKnownMockInventoryItem(hub)) {
      return { state: "not_found", hub: null };
    }

    return {
      state: "ok",
      hub,
    };
  } catch (error) {
    console.error("[Aprendiz Bay] Erro ao buscar turma coletiva:", error);
    return resolveFailedHubItem("error", {
      mocksEnabled: areMockTutorsEnabled(),
      mockHub: (await getMockOpenHubs()).find((hub) => hub.id === hubId) ?? null,
    });
  }
}

export async function fetchHub(hubId: string): Promise<CollectiveHubLive | null> {
  const result = await fetchCollectiveHubById(hubId);
  return result.hub;
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
