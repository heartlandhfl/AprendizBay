import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  mapBookingRecord,
  type BookingRecord,
} from "@/lib/bookings/server";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  ASAAS_CHECKOUT_MINUTES_TO_EXPIRE,
  DEAD_ASAAS_CHECKOUT_STATUSES,
  PAID_ASAAS_CHECKOUT_STATUSES,
  REUSABLE_ASAAS_CHECKOUT_STATUSES,
  buildCheckoutUrl,
  createAsaasCheckout,
  getAsaasAccessToken,
  inspectAsaasCheckout,
  type AsaasCheckoutResult,
  type AsaasCustomerData,
} from "@/lib/payments/asaas";
import { getPlatformFeePercent, splitBookingPrice } from "@/lib/payments/fees";
import { canStartCheckout } from "@/lib/payments/status";

export const CHECKOUT_LOCK_MS = 45_000;

export const CHECKOUT_ERRORS = {
  notFound: "Reserva não encontrada.",
  notOwner: "Você só pode pagar as suas próprias reservas.",
  cancelled: "Esta reserva foi cancelada.",
  alreadyPaid: "Esta reserva já foi paga.",
  alreadyConfirmed: "Esta reserva já está confirmada.",
  notPending: "Esta reserva não está disponível para pagamento.",
  awaitingTutor: "Aguarde o professor confirmar a aula antes de pagar.",
  invalidPrice: "O valor da reserva é inválido.",
  tutorIneligible: "Este professor não está disponível para receber pagamentos.",
  inProgress: "O pagamento já está sendo gerado. Tente novamente em instantes.",
  asaasMissing: "A configuração de pagamento não está disponível.",
  adminMissing: "Não foi possível preparar o pagamento.",
} as const;

export interface CreateBookingCheckoutInput {
  uid: string;
  bookingId: string;
  customer: AsaasCustomerData;
  siteUrl: string;
}

export interface CreateBookingCheckoutSuccess {
  ok: true;
  checkoutId: string;
  checkoutUrl: string;
  reused: boolean;
}

export interface CreateBookingCheckoutFailure {
  ok: false;
  status: number;
  error: string;
}

export type CreateBookingCheckoutResult =
  | CreateBookingCheckoutSuccess
  | CreateBookingCheckoutFailure;

export interface CheckoutTransaction {
  getBooking(bookingId: string): Promise<BookingRecord | null>;
  updateBooking(bookingId: string, updates: Record<string, unknown>): void;
}

export interface CheckoutStore {
  runAtomic<T>(work: (tx: CheckoutTransaction) => Promise<T>): Promise<T>;
  getTutor(tutorId: string): Promise<{ isVerified: boolean } | null>;
}

export interface CreateBookingCheckoutDeps {
  store?: CheckoutStore;
  createCheckout?: typeof createAsaasCheckout;
  inspectCheckout?: (checkoutId: string) => Promise<AsaasCheckoutResult | null>;
  requireAsaasConfigured?: () => void;
  now?: () => Date;
}

function fail(status: number, error: string): CreateBookingCheckoutFailure {
  return { ok: false, status, error };
}

function validatePayableBooking(
  booking: BookingRecord,
  uid: string,
): CreateBookingCheckoutFailure | null {
  if (booking.studentId !== uid) {
    return fail(403, CHECKOUT_ERRORS.notOwner);
  }
  if (booking.status === "cancelled") {
    return fail(409, CHECKOUT_ERRORS.cancelled);
  }
  if (booking.paymentStatus === "paid") {
    return fail(409, CHECKOUT_ERRORS.alreadyPaid);
  }
  if (booking.status === "confirmed") {
    return fail(409, CHECKOUT_ERRORS.alreadyConfirmed);
  }
  if (booking.status !== "pending") {
    return fail(409, CHECKOUT_ERRORS.notPending);
  }
  if (!canStartCheckout(booking)) {
    return fail(409, CHECKOUT_ERRORS.awaitingTutor);
  }
  if (!Number.isFinite(booking.price) || booking.price <= 0) {
    return fail(400, CHECKOUT_ERRORS.invalidPrice);
  }
  return null;
}

function checkoutStillOpen(booking: BookingRecord, now: Date): boolean {
  if (!booking.asaasCheckoutExpiresAt) {
    return true;
  }
  return booking.asaasCheckoutExpiresAt.getTime() > now.getTime();
}

function lockIsActive(booking: BookingRecord, now: Date): boolean {
  return Boolean(
    booking.checkoutLockUntil && booking.checkoutLockUntil.getTime() > now.getTime(),
  );
}

type ClaimKind = "reuse" | "create" | "in_progress" | "invalid";

interface ClaimResult {
  kind: ClaimKind;
  booking?: BookingRecord;
  error?: CreateBookingCheckoutFailure;
}

async function inspectExistingCheckout(
  booking: BookingRecord,
  now: Date,
  inspectCheckout: (checkoutId: string) => Promise<AsaasCheckoutResult | null>,
): Promise<CreateBookingCheckoutResult | "create"> {
  const checkoutId = booking.asaasCheckoutId?.trim();
  if (!checkoutId) {
    return "create";
  }

  const remote = await inspectCheckout(checkoutId);
  if (remote) {
    const status = remote.status?.toUpperCase();
    if (status && PAID_ASAAS_CHECKOUT_STATUSES.has(status)) {
      return fail(409, CHECKOUT_ERRORS.alreadyPaid);
    }
    if (status && DEAD_ASAAS_CHECKOUT_STATUSES.has(status)) {
      return "create";
    }
    if (!status || REUSABLE_ASAAS_CHECKOUT_STATUSES.has(status)) {
      return {
        ok: true,
        checkoutId: remote.id,
        checkoutUrl: remote.checkoutUrl,
        reused: true,
      };
    }
    return "create";
  }

  if (checkoutStillOpen(booking, now) && booking.paymentStatus !== "expired") {
    return {
      ok: true,
      checkoutId,
      checkoutUrl: buildCheckoutUrl(checkoutId),
      reused: true,
    };
  }

  return "create";
}

export function createMemoryCheckoutStore(
  bookings: Map<string, BookingRecord> = new Map(),
  tutors: Map<string, { isVerified: boolean }> = new Map(),
): CheckoutStore & {
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
    runAtomic<T>(work: (tx: CheckoutTransaction) => Promise<T>): Promise<T> {
      const run = queue.then(async () => {
        const pending: Array<[string, Record<string, unknown>]> = [];
        const tx: CheckoutTransaction = {
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
          const next: BookingRecord = { ...current };
          if (typeof updates.paymentStatus === "string") {
            next.paymentStatus = updates.paymentStatus as BookingRecord["paymentStatus"];
          }
          if (typeof updates.asaasCheckoutId === "string") {
            next.asaasCheckoutId = updates.asaasCheckoutId;
          }
          if (updates.asaasCheckoutExpiresAt instanceof Date) {
            next.asaasCheckoutExpiresAt = updates.asaasCheckoutExpiresAt;
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

export function createFirestoreCheckoutStore(db: Firestore): CheckoutStore {
  return {
    async getTutor(tutorId) {
      const snap = await db.collection("tutors").doc(tutorId).get();
      if (!snap.exists) {
        return null;
      }
      return { isVerified: snap.data()?.isVerified === true };
    },
    async runAtomic<T>(work: (tx: CheckoutTransaction) => Promise<T>): Promise<T> {
      return db.runTransaction(async (transaction) => {
        const pendingWrites: Array<() => void> = [];
        const tx: CheckoutTransaction = {
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

function getDefaultStore(): CheckoutStore {
  return createFirestoreCheckoutStore(getFirestore(getAdminApp()));
}

function requireAsaasApiKey(): void {
  getAsaasAccessToken();
}

async function claimCreateSlot(
  store: CheckoutStore,
  uid: string,
  bookingId: string,
  now: Date,
  ignoreCheckoutId?: string,
): Promise<ClaimResult> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return { kind: "invalid", error: fail(404, CHECKOUT_ERRORS.notFound) };
    }
    const invalid = validatePayableBooking(booking, uid);
    if (invalid) {
      return { kind: "invalid", error: invalid };
    }
    const existingId = booking.asaasCheckoutId?.trim();
    if (
      existingId &&
      existingId !== ignoreCheckoutId &&
      booking.paymentStatus !== "expired" &&
      checkoutStillOpen(booking, now)
    ) {
      return { kind: "reuse", booking };
    }
    if (lockIsActive(booking, now)) {
      return { kind: "in_progress" };
    }
    tx.updateBooking(booking.id, {
      checkoutLockUntil: new Date(now.getTime() + CHECKOUT_LOCK_MS),
    });
    return { kind: "create", booking };
  });
}

async function restoreAwaitingPayment(
  store: CheckoutStore,
  bookingId: string,
): Promise<void> {
  await store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return;
    }
    if (booking.paymentStatus === "failed" || booking.paymentStatus === "expired") {
      tx.updateBooking(booking.id, { paymentStatus: "awaiting_payment" });
    }
  });
}

async function clearCheckoutLock(
  store: CheckoutStore,
  bookingId: string,
): Promise<void> {
  await store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return;
    }
    tx.updateBooking(booking.id, { checkoutLockUntil: null });
  });
}

async function saveCreatedCheckout(
  store: CheckoutStore,
  uid: string,
  bookingId: string,
  checkout: AsaasCheckoutResult,
  expiresAt: Date,
  now: Date,
  replacedCheckoutId?: string,
): Promise<CreateBookingCheckoutResult> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return fail(404, CHECKOUT_ERRORS.notFound);
    }
    const invalid = validatePayableBooking(booking, uid);
    if (invalid) {
      return invalid;
    }
    const existingId = booking.asaasCheckoutId?.trim();
    if (
      existingId &&
      existingId !== checkout.id &&
      existingId !== replacedCheckoutId &&
      booking.paymentStatus !== "expired" &&
      checkoutStillOpen(booking, now)
    ) {
      tx.updateBooking(booking.id, { checkoutLockUntil: null });
      return {
        ok: true as const,
        checkoutId: existingId,
        checkoutUrl: buildCheckoutUrl(existingId),
        reused: true,
      };
    }
    const feeSplit = splitBookingPrice(booking.price, getPlatformFeePercent());
    tx.updateBooking(booking.id, {
      asaasCheckoutId: checkout.id,
      asaasCheckoutExpiresAt: expiresAt,
      checkoutLockUntil: null,
      paymentStatus: "awaiting_payment",
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
    });
    return {
      ok: true as const,
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkoutUrl,
      reused: false,
    };
  });
}

export async function createBookingCheckout(
  input: CreateBookingCheckoutInput,
  deps: CreateBookingCheckoutDeps = {},
): Promise<CreateBookingCheckoutResult> {
  const store = deps.store ?? getDefaultStore();
  const now = deps.now?.() ?? new Date();
  const inspectCheckout = deps.inspectCheckout ?? inspectAsaasCheckout;
  const createCheckout = deps.createCheckout ?? createAsaasCheckout;
  const requireAsaas = deps.requireAsaasConfigured ?? requireAsaasApiKey;

  let booking: BookingRecord | null;
  try {
    booking = await store.runAtomic((tx) => tx.getBooking(input.bookingId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Firebase Admin")) {
      return fail(503, CHECKOUT_ERRORS.adminMissing);
    }
    throw error;
  }
  if (!booking) {
    return fail(404, CHECKOUT_ERRORS.notFound);
  }

  const invalid = validatePayableBooking(booking, input.uid);
  if (invalid) {
    return invalid;
  }

  const tutor = await store.getTutor(booking.tutorId);
  if (!tutor?.isVerified) {
    return fail(409, CHECKOUT_ERRORS.tutorIneligible);
  }

  try {
    requireAsaas();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ASAAS_API_KEY") || message.includes("not configured")) {
      return fail(503, CHECKOUT_ERRORS.asaasMissing);
    }
    throw error;
  }

  const existing = await inspectExistingCheckout(booking, now, inspectCheckout);
  if (existing !== "create") {
    if (existing.ok) {
      await restoreAwaitingPayment(store, booking.id);
    }
    return existing;
  }

  let ignoreCheckoutId = booking.asaasCheckoutId?.trim() || undefined;
  let payable: BookingRecord | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const claim = await claimCreateSlot(
      store,
      input.uid,
      input.bookingId,
      now,
      ignoreCheckoutId,
    );
    if (claim.kind === "invalid" && claim.error) {
      return claim.error;
    }
    if (claim.kind === "in_progress") {
      return fail(409, CHECKOUT_ERRORS.inProgress);
    }
    if (claim.kind === "reuse" && claim.booking?.asaasCheckoutId) {
      const reused = await inspectExistingCheckout(claim.booking, now, inspectCheckout);
      if (reused !== "create") {
        if (reused.ok) {
          await restoreAwaitingPayment(store, claim.booking.id);
        }
        return reused;
      }
      ignoreCheckoutId = claim.booking.asaasCheckoutId.trim();
      continue;
    }
    payable = claim.booking;
    break;
  }

  if (!payable) {
    return fail(409, CHECKOUT_ERRORS.inProgress);
  }

  const typeLabel = BOOKING_TYPE_LABELS[payable.type] ?? "Aula";
  const minutesToExpire = ASAAS_CHECKOUT_MINUTES_TO_EXPIRE;
  let checkout: AsaasCheckoutResult;
  try {
    checkout = await createCheckout({
      bookingId: payable.id,
      itemName: `Aula ${typeLabel}`.slice(0, 30),
      itemDescription: `Pagamento da aula ${typeLabel.toLowerCase()} no Aprendiz Bay`,
      value: payable.price,
      customer: input.customer,
      successUrl: `${input.siteUrl}/bookings?pagamento=sucesso`,
      cancelUrl: `${input.siteUrl}/bookings?pagamento=cancelado`,
      expiredUrl: `${input.siteUrl}/bookings?pagamento=expirado`,
      minutesToExpire,
    });
  } catch (error) {
    await clearCheckoutLock(store, payable.id).catch(() => undefined);
    throw error;
  }

  const expiresAt = new Date(now.getTime() + minutesToExpire * 60_000);
  return saveCreatedCheckout(
    store,
    input.uid,
    payable.id,
    checkout,
    expiresAt,
    now,
    ignoreCheckoutId,
  );
}
