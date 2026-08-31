import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import type {
  Booking,
  BookingStatus,
  CreateBookingInput,
  PaymentStatus,
} from "@/lib/bookings/types";
import { normalizeBookingId } from "@/lib/bookings/complete-lesson";
import { parseOccupiedStarts } from "@/lib/bookings/occupancy";
import type { Modality } from "@/lib/mock-tutors";
import { requestNotification } from "@/lib/notifications/client";
import { loadPlatformFeePercent, splitBookingPrice } from "@/lib/payments/fees";

function readOptionalMoney(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function mapBookingDoc(id: string, data: Record<string, unknown>): Booking {
  return {
    id,
    studentId: data.studentId as string,
    tutorId: data.tutorId as string,
    hubId: data.hubId as string | undefined,
    type: data.type as Booking["type"],
    status: data.status as BookingStatus,
    price: data.price as number,
    platformFee: readOptionalMoney(data.platformFee),
    tutorAmount: readOptionalMoney(data.tutorAmount),
    scheduledAt: data.scheduledAt as Timestamp,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp | undefined,
    completedAt: data.completedAt as Timestamp | undefined,
    meetingUrl: data.meetingUrl as string | undefined,
    paymentStatus: (data.paymentStatus as PaymentStatus | undefined) ?? "unpaid",
    paymentId: data.paymentId as string | undefined,
    asaasCheckoutId: data.asaasCheckoutId as string | undefined,
    refundId: data.refundId as string | undefined,
    refundStatus: data.refundStatus as string | undefined,
    refundAmount: readOptionalMoney(data.refundAmount),
  };
}

export async function createBooking(
  studentId: string,
  input: CreateBookingInput,
): Promise<string> {
  await requireFirebaseApp();
  const feeSplit =
    typeof input.platformFee === "number" && typeof input.tutorAmount === "number"
      ? { platformFee: input.platformFee, tutorAmount: input.tutorAmount }
      : splitBookingPrice(input.price, await loadPlatformFeePercent());
  const bookingData = {
    studentId,
    tutorId: input.tutorId,
    type: input.type,
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    price: input.price,
    platformFee: feeSplit.platformFee,
    tutorAmount: feeSplit.tutorAmount,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    createdAt: serverTimestamp(),
    ...(input.hubId ? { hubId: input.hubId } : {}),
  };

  const docRef = await addDoc(collection(db, "bookings"), bookingData);
  void requestNotification({ type: "pending_booking", bookingId: docRef.id });
  return docRef.id;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<void> {
  await requireFirebaseApp();
  await updateDoc(doc(db, "bookings", bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });

  if (status === "confirmed") {
    void requestNotification({ type: "confirmed_booking", bookingId });
  }
}

async function cancelBookingViaApi(bookingId: string): Promise<void> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para cancelar esta reserva.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/bookings/cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível cancelar a reserva.");
  }
}

export async function cancelBookingAsStudent(bookingId: string): Promise<void> {
  await cancelBookingViaApi(bookingId);
}

export async function confirmBookingAsTutor(bookingId: string): Promise<void> {
  await requireFirebaseApp();
  await updateDoc(doc(db, "bookings", bookingId), {
    paymentStatus: "awaiting_payment" as PaymentStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function cancelBookingAsTutor(bookingId: string): Promise<void> {
  await cancelBookingViaApi(bookingId);
}

export async function markBookingCompleted(bookingId: string): Promise<void> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para concluir esta aula.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/bookings/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível marcar a aula como concluída.");
  }
}

export function hasScheduledTimePassed(scheduledAt: Timestamp, now: Date = new Date()): boolean {
  return scheduledAt.toMillis() <= now.getTime();
}

export async function fetchTutorOccupiedStarts(tutorId: string): Promise<Date[]> {
  const response = await fetch(
    `/api/bookings/occupancy?tutorId=${encodeURIComponent(tutorId)}`,
  );
  const payload = (await response.json().catch(() => null)) as
    | { occupiedStarts?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error || "Não foi possível verificar horários já reservados.",
    );
  }

  return parseOccupiedStarts(payload);
}

export function subscribeToTutorPendingBookings(
  tutorId: string,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("tutorId", "==", tutorId),
      where("status", "==", "pending"),
    );

    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        onChange(
          snapshot.docs.map((docSnap) =>
            mapBookingDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
          ),
        );
      },
      (error) => onError?.(error),
    );
  });
}

export function subscribeToStudentBookings(
  studentId: string,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("studentId", "==", studentId),
    );

    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookings = snapshot.docs
          .map((docSnap) =>
            mapBookingDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
          )
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });

        onChange(bookings);
      },
      (error) => onError?.(error),
    );
  });
}

export function subscribeToTutorConfirmedBookings(
  tutorId: string,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("tutorId", "==", tutorId),
      where("status", "==", "confirmed"),
    );

    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookings = snapshot.docs
          .map((docSnap) =>
            mapBookingDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
          )
          .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis());

        onChange(bookings);
      },
      (error) => onError?.(error),
    );
  });
}

export function subscribeToTutorPendingBookingCount(
  tutorId: string,
  onChange: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToTutorPendingBookings(
    tutorId,
    (bookings) => onChange(bookings.length),
    onError,
  );
}

export function subscribeToBooking(
  bookingId: string,
  onChange: (booking: Booking | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const id = normalizeBookingId(bookingId);
  if (!id) {
    onChange(null);
    return () => {};
  }

  return whenFirebaseReady(() => {
    return onSnapshot(
      doc(db, "bookings", id),
      (snapshot) => {
        onChange(
          snapshot.exists()
            ? mapBookingDoc(snapshot.id, snapshot.data() as Record<string, unknown>)
            : null,
        );
      },
      (error) => onError?.(error),
    );
  });
}

export async function fetchUserDisplayName(userId: string): Promise<string> {
  await requireFirebaseApp();
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) {
    return "Conta encerrada";
  }

  return (snapshot.data().displayName as string) || "Usuário";
}

export async function fetchTutorName(tutorId: string): Promise<string> {
  const details = await fetchTutorLessonDetails(tutorId);
  return details.name;
}

export async function fetchTutorLessonDetails(tutorId: string): Promise<{
  name: string;
  subject: string;
  modality: Modality;
}> {
  await requireFirebaseApp();
  const snapshot = await getDoc(doc(db, "tutors", tutorId));
  if (!snapshot.exists()) {
    return {
      name: "Professor",
      subject: "Disciplina não informada",
      modality: "online",
    };
  }

  const data = snapshot.data();
  const modality = data.modality;

  return {
    name: (data.name as string) || "Professor",
    subject:
      typeof data.subject === "string" && data.subject.trim()
        ? data.subject.trim()
        : "Disciplina não informada",
    modality:
      modality === "presencial" || modality === "ambos" || modality === "online"
        ? modality
        : "online",
  };
}

export function formatBookingDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatBookingPrice(price: number): string {
  const hasCents = Math.round(price * 100) % 100 !== 0;
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function startOfTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

export function defaultScheduledAt(): Date {
  return startOfTomorrow();
}
