import assert from "node:assert/strict";
import { formatCpf, isValidCpf } from "../lib/payments/cpf";
import { buildCheckoutUrl, parseAsaasWebhook } from "../lib/payments/asaas";

assert.equal(isValidCpf("24971563792"), true);
assert.equal(isValidCpf("249.715.637-92"), true);
assert.equal(isValidCpf("11111111111"), false);
assert.equal(isValidCpf("123"), false);
assert.equal(formatCpf("24971563792"), "249.715.637-92");

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

console.log("payment unit checks passed");
