import assert from "node:assert/strict";
import { formatCpf, formatPostalCode, isValidCpf, isValidPhone, isValidPostalCode } from "../lib/payments/cpf";
import { buildCheckoutUrl, parseAsaasWebhook } from "../lib/payments/asaas";
import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  parsePlatformFeePercent,
  resolveBookingFeeSplit,
  splitBookingPrice,
} from "../lib/payments/fees";

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

console.log("payment unit checks passed");
