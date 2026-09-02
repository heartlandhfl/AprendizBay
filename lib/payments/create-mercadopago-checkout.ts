import { getFirestore } from "firebase-admin/firestore";
import { type BookingRecord } from "@/lib/bookings/server";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  CHECKOUT_ERRORS,
  CHECKOUT_LOCK_MS,
  type CheckoutStore,
  createFirestoreCheckoutStore,
  type CreateBookingCheckoutFailure,
  type CreateBookingCheckoutResult,
  type CreateBookingCheckoutSuccess,
} from "@/lib/payments/create-checkout";
import { createPaymentGateway } from "@/lib/payments/gateway/factory";
import type { CreateCheckoutResult } from "@/lib/payments/gateway/types";
import { getMercadoPagoAccessToken } from "@/lib/payments/mercadopago";
import { getPlatformFeePercent, splitBookingPrice } from "@/lib/payments/fees";
import { authoritativeLessonPrice } from "@/lib/payments/money";
import { canStartCheckout } from "@/lib/payments/status";

export const MERCADOPAGO_CHECKOUT_MINUTES_TO_EXPIRE = 1440;

export interface MercadoPagoCheckoutCustomer {
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface CreateMercadoPagoBookingCheckoutInput {
  uid: string;
  bookingId: string;
  customer: MercadoPagoCheckoutCustomer;
  siteUrl: string;
}

export interface CreateMercadoPagoBookingCheckoutDeps {
  store?: CheckoutStore;
  createCheckout?: (input: {
    bookingId: string;
    itemName: string;
    itemDescription: string;
    amount: number;
    customer: MercadoPagoCheckoutCustomer;
    successUrl: string;
    cancelUrl: string;
    notificationUrl: string;
    minutesToExpire: number;
  }) => Promise<CreateCheckoutResult>;
  requireMercadoPagoConfigured?: () => void;
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
  if (!authoritativeLessonPrice(booking.price)) {
    return fail(400, CHECKOUT_ERRORS.invalidPrice);
  }
  return null;
}

function checkoutStillOpen(booking: BookingRecord, now: Date): boolean {
  if (!booking.paymentCheckoutExpiresAt) {
    return true;
  }
  return booking.paymentCheckoutExpiresAt.getTime() > now.getTime();
}

function lockIsActive(booking: BookingRecord, now: Date): boolean {
  return Boolean(
    booking.checkoutLockUntil && booking.checkoutLockUntil.getTime() > now.getTime(),
  );
}

function requireMercadoPagoApiKey(): void {
  getMercadoPagoAccessToken();
}

async function claimCreateSlot(
  store: CheckoutStore,
  uid: string,
  bookingId: string,
  now: Date,
): Promise<
  | { kind: "invalid"; error: CreateBookingCheckoutFailure }
  | { kind: "reuse"; booking: BookingRecord }
  | { kind: "in_progress" }
  | { kind: "create"; booking: BookingRecord }
> {
  return store.runAtomic(async (tx) => {
    const booking = await tx.getBooking(bookingId);
    if (!booking) {
      return { kind: "invalid", error: fail(404, CHECKOUT_ERRORS.notFound) };
    }
    const invalid = validatePayableBooking(booking, uid);
    if (invalid) {
      return { kind: "invalid", error: invalid };
    }
    const existingId = booking.paymentCheckoutId?.trim();
    if (
      existingId &&
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

async function clearCheckoutLock(store: CheckoutStore, bookingId: string): Promise<void> {
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
  checkout: CreateCheckoutResult,
  expiresAt: Date,
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
    const feeSplit = splitBookingPrice(booking.price, getPlatformFeePercent());
    tx.updateBooking(booking.id, {
      paymentCheckoutId: checkout.checkoutId,
      paymentCheckoutUrl: checkout.checkoutUrl,
      paymentCheckoutExpiresAt: expiresAt,
      checkoutLockUntil: null,
      paymentStatus: "awaiting_payment",
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
    });
    return {
      ok: true as const,
      checkoutId: checkout.checkoutId,
      checkoutUrl: checkout.checkoutUrl,
      reused: false,
    };
  });
}

function getDefaultStore(): CheckoutStore {
  return createFirestoreCheckoutStore(getFirestore(getAdminApp()));
}

function defaultCreateCheckout(input: {
  bookingId: string;
  itemName: string;
  itemDescription: string;
  amount: number;
  customer: MercadoPagoCheckoutCustomer;
  successUrl: string;
  cancelUrl: string;
  notificationUrl: string;
  minutesToExpire: number;
}): Promise<CreateCheckoutResult> {
  const gateway = createPaymentGateway("mercadopago");
  return gateway.createCheckout({
    bookingId: input.bookingId,
    itemName: input.itemName,
    itemDescription: input.itemDescription,
    amount: input.amount,
    customer: input.customer,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    notificationUrl: input.notificationUrl,
    minutesToExpire: input.minutesToExpire,
  });
}

export async function createMercadoPagoBookingCheckout(
  input: CreateMercadoPagoBookingCheckoutInput,
  deps: CreateMercadoPagoBookingCheckoutDeps = {},
): Promise<CreateBookingCheckoutResult> {
  const store = deps.store ?? getDefaultStore();
  const now = deps.now?.() ?? new Date();
  const createCheckout = deps.createCheckout ?? defaultCreateCheckout;
  const requireMercadoPago = deps.requireMercadoPagoConfigured ?? requireMercadoPagoApiKey;

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
    requireMercadoPago();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("MERCADOPAGO_ACCESS_TOKEN") || message.includes("not configured")) {
      return fail(503, CHECKOUT_ERRORS.asaasMissing);
    }
    throw error;
  }

  const existingCheckoutId = booking.paymentCheckoutId?.trim();
  if (
    existingCheckoutId &&
    booking.paymentCheckoutExpiresAt &&
    checkoutStillOpen(booking, now) &&
    booking.paymentStatus !== "expired"
  ) {
    return {
      ok: true,
      checkoutId: existingCheckoutId,
      checkoutUrl: booking.paymentCheckoutUrl ?? "",
      reused: true,
    } satisfies CreateBookingCheckoutSuccess;
  }

  const claim = await claimCreateSlot(store, input.uid, input.bookingId, now);
  if (claim.kind === "invalid" && claim.error) {
    return claim.error;
  }
  if (claim.kind === "in_progress") {
    return fail(409, CHECKOUT_ERRORS.inProgress);
  }
  if (claim.kind === "reuse") {
    const reusedId = claim.booking.paymentCheckoutId?.trim();
    if (!reusedId || !claim.booking.paymentCheckoutUrl) {
      return fail(409, CHECKOUT_ERRORS.inProgress);
    }
    return {
      ok: true,
      checkoutId: reusedId,
      checkoutUrl: claim.booking.paymentCheckoutUrl,
      reused: true,
    };
  }

  if (claim.kind !== "create" || !claim.booking) {
    return fail(409, CHECKOUT_ERRORS.inProgress);
  }

  const payable = claim.booking;
  const typeLabel = BOOKING_TYPE_LABELS[payable.type] ?? "Aula";
  const minutesToExpire = MERCADOPAGO_CHECKOUT_MINUTES_TO_EXPIRE;
  const serverPrice = authoritativeLessonPrice(payable.price)?.price ?? payable.price;

  let checkout: CreateCheckoutResult;
  try {
    checkout = await createCheckout({
      bookingId: payable.id,
      itemName: `Aula ${typeLabel}`.slice(0, 256),
      itemDescription: `Pagamento da aula ${typeLabel.toLowerCase()} no Aprendiz Bay`,
      amount: serverPrice,
      customer: input.customer,
      successUrl: `${input.siteUrl}/bookings?pagamento=sucesso`,
      cancelUrl: `${input.siteUrl}/bookings?pagamento=cancelado`,
      notificationUrl: `${input.siteUrl}/api/payments/webhook/mercadopago`,
      minutesToExpire,
    });
  } catch (error) {
    await clearCheckoutLock(store, payable.id).catch(() => undefined);
    throw error;
  }

  const expiresAt = new Date(now.getTime() + minutesToExpire * 60_000);
  return saveCreatedCheckout(store, input.uid, payable.id, checkout, expiresAt);
}
