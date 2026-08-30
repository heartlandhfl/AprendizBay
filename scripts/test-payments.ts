import assert from "node:assert/strict";
import { formatCpf, formatPostalCode, isValidCpf, isValidPhone, isValidPostalCode } from "../lib/payments/cpf";
import { buildCheckoutUrl, parseAsaasWebhook } from "../lib/payments/asaas";
import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  parsePlatformFeePercent,
  resolveBookingFeeSplit,
  splitBookingPrice,
} from "../lib/payments/fees";
import { BOOKING_FEE_LABELS } from "../lib/bookings/types";
import { parsePlatformFeePercent as parseExpressPlatformFeePercent } from "../server/api/public-config.js";
import {
  decideCancellation,
  getCancellationCopy,
  isFreeCancellationWindow,
} from "../lib/bookings/cancellation";
import {
  buildMercadoPagoRefundUrl,
  parseMercadoPagoRefund,
  refundMercadoPagoPayment,
  resolveMercadoPagoPaymentId,
} from "../lib/payments/mercadopago";

assert.equal(isValidCpf("24971563792"), true);
assert.equal(isValidCpf("249.715.637-92"), true);
assert.equal(isValidCpf("11111111111"), false);
assert.equal(isValidCpf("123"), false);
assert.equal(formatCpf("24971563792"), "249.715.637-92");
assert.equal(isValidPhone("47988887777"), true);
assert.equal(isValidPhone("123"), false);
assert.equal(isValidPostalCode("01310-000"), true);
assert.equal(formatPostalCode("01310000"), "01310-000");

const paid = parseAsaasWebhook({
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_080225913252",
    status: "CONFIRMED",
    externalReference: "booking-123",
    checkoutSession: "checkout-abc",
  },
});

assert.equal(paid.isSuccessfulPayment, true);
assert.equal(paid.bookingId, "booking-123");
assert.equal(paid.paymentId, "pay_080225913252");
assert.equal(paid.asaasCheckoutId, "checkout-abc");

const checkoutPaid = parseAsaasWebhook({
  event: "CHECKOUT_PAID",
  checkout: {
    id: "131ca662-56c8-4479-b5b3-fd61a413fce7",
    status: "PAID",
    externalReference: "booking-456",
  },
});

assert.equal(checkoutPaid.isSuccessfulPayment, true);
assert.equal(checkoutPaid.bookingId, "booking-456");
assert.equal(checkoutPaid.asaasCheckoutId, "131ca662-56c8-4479-b5b3-fd61a413fce7");

const ignored = parseAsaasWebhook({ event: "PAYMENT_CREATED", payment: { id: "pay_1" } });
assert.equal(ignored.isSuccessfulPayment, false);

assert.equal(
  buildCheckoutUrl("checkout-1"),
  "https://asaas.com/checkoutSession/show?id=checkout-1",
);
assert.equal(
  buildCheckoutUrl("checkout-1", "https://sandbox.asaas.com/checkoutSession/show/checkout-1"),
  "https://sandbox.asaas.com/checkoutSession/show/checkout-1",
);

assert.equal(parsePlatformFeePercent(undefined), DEFAULT_PLATFORM_FEE_PERCENT);
assert.equal(parsePlatformFeePercent(""), DEFAULT_PLATFORM_FEE_PERCENT);
assert.equal(parsePlatformFeePercent("15"), 15);
assert.equal(parsePlatformFeePercent(-1), DEFAULT_PLATFORM_FEE_PERCENT);
assert.equal(parsePlatformFeePercent(101), DEFAULT_PLATFORM_FEE_PERCENT);

assert.deepEqual(splitBookingPrice(80, 10), { platformFee: 8, tutorAmount: 72 });
assert.deepEqual(splitBookingPrice(85, 10), { platformFee: 8.5, tutorAmount: 76.5 });
assert.deepEqual(splitBookingPrice(100, 0), { platformFee: 0, tutorAmount: 100 });
assert.deepEqual(resolveBookingFeeSplit({ price: 80, platformFee: 12, tutorAmount: 68 }), {
  platformFee: 12,
  tutorAmount: 68,
});
assert.deepEqual(resolveBookingFeeSplit({ price: 80 }), splitBookingPrice(80));

assert.equal(BOOKING_FEE_LABELS.lesson, "Valor da aula");
assert.equal(BOOKING_FEE_LABELS.tutor, "Valor do professor");
assert.equal(BOOKING_FEE_LABELS.platform, "Taxa da plataforma");
assert.equal(BOOKING_FEE_LABELS.total, "Total a pagar");
assert.equal(parseExpressPlatformFeePercent("12.5"), 12.5);
assert.equal(parseExpressPlatformFeePercent("nope"), DEFAULT_PLATFORM_FEE_PERCENT);

const inThreeDays = new Date("2026-09-02T12:00:00.000Z");
const now = new Date("2026-08-30T12:00:00.000Z");
const inTwelveHours = new Date("2026-08-31T00:00:00.000Z");

assert.equal(isFreeCancellationWindow(inThreeDays, now), true);
assert.equal(isFreeCancellationWindow(inTwelveHours, now), false);

assert.deepEqual(
  decideCancellation({
    status: "confirmed",
    paymentStatus: "paid",
    scheduledAt: inThreeDays,
    actor: "student",
    now,
  }),
  { canCancel: true, willRefund: true, reason: "free_window_refund" },
);
assert.deepEqual(
  decideCancellation({
    status: "confirmed",
    paymentStatus: "paid",
    scheduledAt: inTwelveHours,
    actor: "student",
    now,
  }),
  { canCancel: false, willRefund: false, reason: "late_student" },
);
assert.deepEqual(
  decideCancellation({
    status: "confirmed",
    paymentStatus: "paid",
    scheduledAt: inTwelveHours,
    actor: "tutor",
    now,
  }),
  { canCancel: true, willRefund: true, reason: "tutor_refund" },
);
assert.deepEqual(
  decideCancellation({
    status: "pending",
    paymentStatus: "unpaid",
    scheduledAt: inTwelveHours,
    actor: "student",
    now,
  }),
  { canCancel: true, willRefund: false, reason: "unpaid" },
);

const refundCopy = getCancellationCopy(
  { canCancel: true, willRefund: true, reason: "free_window_refund" },
  "R$ 80",
);
assert.match(refundCopy.amountNote, /R\$ 80/);
assert.match(refundCopy.amountNote, /Mercado Pago/);
assert.match(
  getCancellationCopy(
    { canCancel: false, willRefund: false, reason: "late_student" },
    "R$ 80",
  ).amountNote,
  /não será reembolsado/,
);

assert.equal(
  buildMercadoPagoRefundUrl("1234567890"),
  "https://api.mercadopago.com/v1/payments/1234567890/refunds",
);
assert.equal(resolveMercadoPagoPaymentId({ paymentId: "pay_asaas" }), "pay_asaas");
assert.equal(
  resolveMercadoPagoPaymentId({ mercadoPagoPaymentId: "987", paymentId: "pay_asaas" }),
  "987",
);
assert.deepEqual(
  parseMercadoPagoRefund({ id: 55, payment_id: 1234567890, status: "approved", amount: 80 }),
  { id: "55", paymentId: "1234567890", status: "approved", amount: 80 },
);

process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-token";

async function assertMercadoPagoRefundRequest() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    assert.equal(String(url), "https://api.mercadopago.com/v1/payments/1234567890/refunds");
    assert.equal(init?.method, "POST");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer TEST-token");
    assert.equal(headers["X-Idempotency-Key"], "booking-refund-abc");
    return {
      ok: true,
      json: async () => ({ id: 77, payment_id: 1234567890, status: "approved", amount: 80 }),
    } as Response;
  }) as typeof fetch;

  try {
    const refund = await refundMercadoPagoPayment({
      paymentId: "1234567890",
      idempotencyKey: "booking-refund-abc",
    });
    assert.deepEqual(refund, {
      id: "77",
      paymentId: "1234567890",
      status: "approved",
      amount: 80,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void assertMercadoPagoRefundRequest()
  .then(() => {
    console.log("payment unit checks passed");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
