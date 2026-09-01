import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authorizeAsaasWebhook,
  isAsaasAlreadyRefundedError,
  isAuthorizedAsaasWebhook,
  parseAsaasRefund,
  parseAsaasWebhook,
  resolveAsaasWebhookOutcome,
} from "@/lib/payments/asaas";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/payments/webhook-receipts";

describe("Asaas webhook outcomes", () => {
  it("maps confirmed and received events to a successful payment", () => {
    expect(resolveAsaasWebhookOutcome({ event: "PAYMENT_CONFIRMED" })).toBe("successful");
    expect(resolveAsaasWebhookOutcome({ event: "CHECKOUT_PAID", checkoutStatus: "PAID" })).toBe(
      "successful",
    );
    expect(
      parseAsaasWebhook({
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_1", status: "RECEIVED", externalReference: "booking-1" },
      }).isSuccessfulPayment,
    ).toBe(true);
  });

  it("maps card capture refusal to a failed payment", () => {
    const event = parseAsaasWebhook({
      event: "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
      payment: {
        id: "pay_refused",
        externalReference: "booking-123",
        checkoutSession: "checkout-abc",
      },
    });

    expect(event.outcome).toBe("failed");
    expect(event.isSuccessfulPayment).toBe(false);
    expect(event.bookingId).toBe("booking-123");
  });

  it("maps expired and abandoned checkouts to expired", () => {
    expect(
      parseAsaasWebhook({
        event: "CHECKOUT_EXPIRED",
        checkout: { id: "checkout-abc", status: "EXPIRED", externalReference: "booking-123" },
      }).outcome,
    ).toBe("expired");
    expect(
      parseAsaasWebhook({
        event: "CHECKOUT_CANCELED",
        checkout: { id: "checkout-abc", externalReference: "booking-123" },
      }).outcome,
    ).toBe("expired");
  });

  it("does not treat checkout created or payment created as paid", () => {
    expect(parseAsaasWebhook({ event: "PAYMENT_CREATED" }).outcome).toBe("ignored");
    expect(parseAsaasWebhook({ event: "CHECKOUT_CREATED" }).outcome).toBe("ignored");
  });
});

describe("Asaas refund responses", () => {
  it("accepts a confirmed Asaas refund status and amount", () => {
    expect(
      parseAsaasRefund({
        id: "pay_080225913252",
        status: "REFUNDED",
        value: 80,
        refunds: [{ status: "DONE", value: 80, endToEndIdentifier: "E123" }],
      }),
    ).toMatchObject({
      paymentId: "pay_080225913252",
      status: "REFUNDED",
      refundId: "E123",
      refundAmount: 80,
    });
  });

  it("does not treat a mere payment id as a successful refund", () => {
    expect(() =>
      parseAsaasRefund({
        id: "pay_080225913252",
        status: "CONFIRMED",
        value: 80,
      }),
    ).toThrow(/não confirmou o estorno/i);
  });

  it("detects an already-refunded Asaas error for idempotent retries", () => {
    expect(
      isAsaasAlreadyRefundedError({
        errors: [{ description: "Payment already refunded." }],
      }),
    ).toBe(true);
  });
});

describe("authorizeAsaasWebhook", () => {
  const originalToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;
  const secret = "test-asaas-webhook-token";

  function headersWith(token?: string): Headers {
    const headers = new Headers();
    if (token !== undefined) {
      headers.set("asaas-access-token", token);
    }
    return headers;
  }

  beforeEach(() => {
    process.env.ASAAS_WEBHOOK_TOKEN = secret;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.ASAAS_WEBHOOK_TOKEN;
    } else {
      process.env.ASAAS_WEBHOOK_TOKEN = originalToken;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("rejects a missing server token with 503 and never authorizes", () => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    const result = authorizeAsaasWebhook(headersWith(secret));

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: WEBHOOK_UNCONFIGURED_MESSAGE,
    });
    expect(isAuthorizedAsaasWebhook(headersWith(secret))).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("rejects a blank server token with 503", () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "   ";

    const result = authorizeAsaasWebhook(headersWith(secret));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toBe(WEBHOOK_UNCONFIGURED_MESSAGE);
    }
  });

  it("rejects an incorrect request token with 401", () => {
    const result = authorizeAsaasWebhook(headersWith("wrong-token"));

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: WEBHOOK_UNAUTHORIZED_MESSAGE,
    });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain("wrong-token");
  });

  it("rejects a request that omits the access token header", () => {
    const result = authorizeAsaasWebhook(headersWith());

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: WEBHOOK_UNAUTHORIZED_MESSAGE,
    });
  });

  it("accepts the correct request token", () => {
    expect(authorizeAsaasWebhook(headersWith(secret))).toEqual({ ok: true });
    expect(isAuthorizedAsaasWebhook(headersWith(secret))).toBe(true);
  });

  it("accepts an explicitly injected test token when env is empty", () => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    const injected = "injected-test-token";

    expect(
      authorizeAsaasWebhook(headersWith(injected), { expectedToken: injected }),
    ).toEqual({ ok: true });
    expect(
      authorizeAsaasWebhook(headersWith("wrong-token"), { expectedToken: injected }),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("fails closed when an empty token is injected even if env has a value", () => {
    const result = authorizeAsaasWebhook(headersWith(secret), { expectedToken: "" });

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: WEBHOOK_UNCONFIGURED_MESSAGE,
    });
  });

  it("does not bypass a missing token when NODE_ENV is test", () => {
    process.env.NODE_ENV = "test";
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    const result = authorizeAsaasWebhook(headersWith(secret));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
    }
  });

  it("does not bypass a missing token when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    const result = authorizeAsaasWebhook(headersWith(secret));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
    }
  });
});
