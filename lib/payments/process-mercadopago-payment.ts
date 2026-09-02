import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { mapBookingRecord, type BookingRecord } from "@/lib/bookings/server";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import { getUserProfile } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  createMercadoPagoPayment,
  getMercadoPagoAccessToken,
  type CreateMercadoPagoPaymentInput,
  type MercadoPagoPaymentResult,
} from "@/lib/payments/mercadopago";
import { getPlatformFeePercent, splitBookingPrice } from "@/lib/payments/fees";
import { authoritativeLessonPrice } from "@/lib/payments/money";
import { canStartCheckout } from "@/lib/payments/status";

export const PROCESS_PAYMENT_LOCK_MS = 45_000;

export const PROCESS_PAYMENT_ERRORS = {
  notFound: "Reserva não encontrada.",
  notOwner: "Você só pode pagar as suas próprias reservas.",
  cancelled: "Esta reserva foi cancelada.",
  alreadyPaid: "Esta reserva já foi paga.",
  alreadyConfirmed: "Esta reserva já está confirmada.",
  notPending: "Esta reserva não está disponível para pagamento.",
  awaitingTutor: "Aguarde o professor confirmar a aula antes de pagar.",
  invalidPrice: "O valor da reserva é inválido.",
  tutorIneligible: "Este professor não está disponível para receber pagamentos.",
  inProgress: "O pagamento já está sendo processado. Tente novamente em instantes.",
  mpMissing: "A configuração de pagamento não está disponível.",
  adminMissing: "Não foi possível preparar o pagamento.",
  invalidToken: "Informe os dados de pagamento para continuar.",
  invalidPaymentMethod: "Método de pagamento inválido.",
  invalidInstallments: "Número de parcelas inválido.",
} as const;

export interface ProcessMercadoPagoPaymentInput {
  uid: string;
  bookingId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  payerEmail?: string;
  payerIdentificationType?: string;
  payerIdentificationNumber?: string;
  notificationUrl?: string;
}

export interface ProcessMercadoPagoPaymentSuccess {
  ok: true;
  paymentId: string;
  status: string;
  statusDetail?: string;
}

export interface ProcessMercadoPagoPaymentFailure {
  ok: false;
  status: number;
  error: string;
}

export type ProcessMercadoPagoPaymentResult =
  | ProcessMercadoPagoPaymentSuccess
  | ProcessMercadoPagoPaymentFailure;

export interface ProcessPaymentTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface ProcessPaymentStore {
  runAtomic<T>(work: (tx: ProcessPaymentTransaction) => Promise<T>): Promise<T>;
  getTutor(tutorId: string): Promise<{ isVerified: boolean } | null>;
}

export interface ProcessMercadoPagoPaymentDeps {
  store?: ProcessPaymentStore;
  createPayment?: (input: CreateMercadoPagoPaymentInput) => Promise<MercadoPagoPaymentResult>;
  getProfile?: (uid: string) => Promise<{ email?: string; displayName?: string } | null>;
  requireMercadoPagoConfigured?: () => void;
  now?: () => Date;
}

function fail(status: number, error: string): ProcessMercadoPagoPaymentFailure {
  return { ok: false, status, error };
}

function validatePayableBooking(
  booking: BookingRecord,
  uid: string,
): ProcessMercadoPagoPaymentFailure | null {
  if (booking.studentId !== uid) {
    return fail(403, PROCESS_PAYMENT_ERRORS.notOwner);
  }
  if (booking.status === "cancelled") {
    return fail(409, PROCESS_PAYMENT_ERRORS.cancelled);
  }
  if (booking.paymentStatus === "paid") {
    return fail(409, PROCESS_PAYMENT_ERRORS.alreadyPaid);
  }
  if (booking.status === "confirmed") {
    return fail(409, PROCESS_PAYMENT_ERRORS.alreadyConfirmed);
  }
  if (booking.status !== "pending") {
    return fail(409, PROCESS_PAYMENT_ERRORS.notPending);
  }
  if (!canStartCheckout(booking)) {
    return fail(409, PROCESS_PAYMENT_ERRORS.awaitingTutor);
  }
  if (!authoritativeLessonPrice(booking.price)) {
    return fail(400, PROCESS_PAYMENT_ERRORS.invalidPrice);
  }
  return null;
}

function lockIsActive(booking: BookingRecord, now: Date): boolean {
  return Boolean(
    booking.checkoutLockUntil && booking.checkoutLockUntil.getTime() > now.getTime(),
  );
}

export function createMemoryProcessPaymentStore(
  bookings: Map<string, BookingRecord> = new Map(),
  tutors: Map<string, { isVerified: boolean }> = new Map(),
): ProcessPaymentStore & {
  bookings: Map<string, BookingRecord>;
  tutors: Map<string, { isVerified: boolean }>;
} {
  let queue = Promise.resolve();

  return {
    bookings,
    tutors,
    async getTutor(tutorId) {
      return tutors.get(tutorId) ?? null;
    },
    runAtomic<T>(work: (tx: ProcessPaymentTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pending: Array<[string, Record<string, unknown>]> = [];
        const tx: ProcessPaymentTransaction = {
          async getBooking(bookingId) {
            return bookings.get(bookingId) ?? null;
          },
          updateBooking(bookingId, updates) {
            pending.push([bookingId, updates]);
          },
        };
        const result = await work(tx);
        for (const [id, updates] of pending) {
          const current = bookings.get(id);
          if (!current) {
            continue;
          }
          const next: BookingRecord = { ...current, ...updates } as BookingRecord;
          if (typeof updates.paymentStatus === "string") {
            next.paymentStatus = updates.paymentStatus as BookingRecord["paymentStatus"];
          }
          if (typeof updates.paymentId === "string") {
            next.paymentId = updates.paymentId;
          }
          if (typeof updates.mercadopagoPaymentStatus === "string") {
            next.mercadopagoPaymentStatus = updates.mercadopagoPaymentStatus;
          }
          if (updates.checkoutLockUntil instanceof Date) {
            next.checkoutLockUntil = updates.checkoutLockUntil;
          }
          if (updates.checkoutLockUntil === null) {
            next.checkoutLockUntil = undefined;
          }
          if (typeof updates.platformFee === "number") {
            next.platformFee = updates.platformFee;
          }
          if (typeof updates.tutorAmount === "number") {
            next.tutorAmount = updates.tutorAmount;
          }
          bookings.set(id, next);
        }
        return result;
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

export function createFirestoreProcessPaymentStore(db: Firestore): ProcessPaymentStore {
  return {
    async getTutor(tutorId) {
      const snap = await db.collection("tutors").doc(tutorId).get();
      if (!snap.exists) {
        return null;
      }
      return { isVerified: snap.data()?.isVerified === true };
    },
    async runAtomic<T>(work: (tx: ProcessPaymentTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];
        const tx: ProcessPaymentTransaction = {
          async getBooking(bookingId) {
            const snap = await transaction.get(db.collection("bookings").doc(bookingId));
            if (!snap.exists) {
              return null;
            }
            return mapBookingRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
          },
          updateBooking(bookingId, updates) {
            const ref = db.collection("bookings").doc(bookingId);
            const payload: Record<string, unknown> = {
              ...updates,
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (payload.checkoutLockUntil === null) {
              payload.checkoutLockUntil = FieldValue.delete();
            }
            pendingWrites.push(() => transaction.update(ref, payload));
          },
        };
        const result = await work(tx);
        for (const write of pendingWrites) {
          write();
        }
        return result;
      });
    },
  };
}

function getDefaultStore(): ProcessPaymentStore {
  return createFirestoreProcessPaymentStore(getFirestore(getAdminApp()));
}

function requireMercadoPagoApiToken(): void {
  getMercadoPagoAccessToken();
}

function sanitizeInstallments(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const installments = Math.trunc(value);
  if (installments < 1 || installments > 24) {
    return null;
  }
  return installments;
}

async function claimPaymentSlot(
  store: ProcessPaymentStore,
  uid: string,
  bookingId: string,
  now: Date,
): Promise<
  | { kind: "invalid"; error: ProcessMercadoPagoPaymentFailure }
  | { kind: "in_progress" }
  | { kind: "ready"; booking: BookingRecord }
> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return { kind: "invalid", error: fail(404, PROCESS_PAYMENT_ERRORS.notFound) };
    }
    const invalid = validatePayableBooking(booking, uid);
    if (invalid) {
      return { kind: "invalid", error: invalid };
    }
    if (lockIsActive(booking, now)) {
      return { kind: "in_progress" };
    }
    tx.updateBooking(booking.id, {
      checkoutLockUntil: new Date(now.getTime() + PROCESS_PAYMENT_LOCK_MS),
    });
    return { kind: "ready", booking };
  });
}

async function clearPaymentLock(store: ProcessPaymentStore, bookingId: string): Promise<void> {
  await store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return;
    }
    tx.updateBooking(booking.id, { checkoutLockUntil: null });
  });
}

async function persistSubmittedPayment(
  store: ProcessPaymentStore,
  uid: string,
  bookingId: string,
  payment: MercadoPagoPaymentResult,
): Promise<ProcessMercadoPagoPaymentResult> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return fail(404, PROCESS_PAYMENT_ERRORS.notFound);
    }
    const invalid = validatePayableBooking(booking, uid);
    if (invalid) {
      return invalid;
    }

    const feeSplit = splitBookingPrice(booking.price, getPlatformFeePercent());
    tx.updateBooking(booking.id, {
      paymentId: payment.id,
      mercadopagoPaymentStatus: payment.status,
      checkoutLockUntil: null,
      paymentStatus: "awaiting_payment",
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
    });

    return {
      ok: true as const,
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.statusDetail,
    };
  });
}

export async function processMercadoPagoBookingPayment(
  input: ProcessMercadoPagoPaymentInput,
  deps: ProcessMercadoPagoPaymentDeps = {},
): Promise<ProcessMercadoPagoPaymentResult> {
  const store = deps.store ?? getDefaultStore();
  const now = deps.now?.() ?? new Date();
  const createPayment = deps.createPayment ?? createMercadoPagoPayment;
  const getProfile = deps.getProfile ?? getUserProfile;
  const requireMercadoPago = deps.requireMercadoPagoConfigured ?? requireMercadoPagoApiToken;

  const bookingId = input.bookingId.trim();
  const token = input.token.trim();
  const paymentMethodId = input.paymentMethodId.trim();

  if (!bookingId) {
    return fail(400, PROCESS_PAYMENT_ERRORS.notFound);
  }
  if (!token) {
    return fail(400, PROCESS_PAYMENT_ERRORS.invalidToken);
  }
  if (!paymentMethodId) {
    return fail(400, PROCESS_PAYMENT_ERRORS.invalidPaymentMethod);
  }

  const installments = sanitizeInstallments(input.installments);
  if (installments == null) {
    return fail(400, PROCESS_PAYMENT_ERRORS.invalidInstallments);
  }

  let booking: BookingRecord | null;
  try {
    booking = await store.runAtomic((tx) => tx.getBooking(bookingId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase Admin")) {
      return fail(503, PROCESS_PAYMENT_ERRORS.adminMissing);
    }
    throw error;
  }

  if (!booking) {
    return fail(404, PROCESS_PAYMENT_ERRORS.notFound);
  }

  const invalid = validatePayableBooking(booking, input.uid);
  if (invalid) {
    return invalid;
  }

  const tutor = await store.getTutor(booking.tutorId);
  if (!tutor?.isVerified) {
    return fail(409, PROCESS_PAYMENT_ERRORS.tutorIneligible);
  }

  try {
    requireMercadoPago();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("MERCADOPAGO_ACCESS_TOKEN") || message.includes("not configured")) {
      return fail(503, PROCESS_PAYMENT_ERRORS.mpMissing);
    }
    throw error;
  }

  const claim = await claimPaymentSlot(store, input.uid, bookingId, now);
  if (claim.kind === "invalid" && claim.error) {
    return claim.error;
  }
  if (claim.kind === "in_progress") {
    return fail(409, PROCESS_PAYMENT_ERRORS.inProgress);
  }
  if (claim.kind !== "ready" || !claim.booking) {
    return fail(409, PROCESS_PAYMENT_ERRORS.inProgress);
  }

  const payable = claim.booking;
  const price = authoritativeLessonPrice(payable.price);
  if (!price) {
    await clearPaymentLock(store, payable.id).catch(() => undefined);
    return fail(400, PROCESS_PAYMENT_ERRORS.invalidPrice);
  }

  const profile = await getProfile(input.uid);
  const email = input.payerEmail?.trim() || profile?.email?.trim() || "";
  if (!email.includes("@")) {
    await clearPaymentLock(store, payable.id).catch(() => undefined);
    return fail(400, "Informe um e-mail válido.");
  }

  const typeLabel = BOOKING_TYPE_LABELS[payable.type] ?? "Aula";
  let payment: MercadoPagoPaymentResult;

  try {
    payment = await createPayment({
      bookingId: payable.id,
      transactionAmount: price.price,
      token,
      paymentMethodId,
      installments,
      issuerId: input.issuerId?.trim() || undefined,
      payer: {
        email,
        ...(input.payerIdentificationType && input.payerIdentificationNumber
          ? {
              identification: {
                type: input.payerIdentificationType,
                number: input.payerIdentificationNumber,
              },
            }
          : {}),
      },
      description: `Pagamento da aula ${typeLabel.toLowerCase()} no Aprendiz Bay`,
      notificationUrl: input.notificationUrl,
      idempotencyKey: `${payable.id}:${now.getTime()}`,
    });
  } catch (error) {
    await clearPaymentLock(store, payable.id).catch(() => undefined);
    throw error;
  }

  return persistSubmittedPayment(store, input.uid, payable.id, payment);
}
