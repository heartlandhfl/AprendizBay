import { describe, expect, it } from "vitest";
import {
  authorizeMercadoPagoWebhook,
  buildMercadoPagoWebhookManifest,
  computeMercadoPagoWebhookSignature,
  parseMercadoPagoPayment,
  parseMercadoPagoWebhookNotification,
  resolveMercadoPagoPaymentOutcome,
} from "@/lib/payments/mercadopago";

describe("mercadopago helpers", () => {
  it("parses a payment payload", () => {
    expect(
      parseMercadoPagoPayment({
        id: "12345",
        status: "approved",
        external_reference: "booking-123",
        transaction_amount: 80,
        currency_id: "BRL",
      }),
    ).toMatchObject({
      id: "12345",
      status: "approved",
      externalReference: "booking-123",
      transactionAmount: 80,
      currencyId: "BRL",
    });
  });

  it("parses webhook notifications", () => {
    expect(
      parseMercadoPagoWebhookNotification({
        id: "notif-1",
        type: "payment",
        action: "payment.updated",
        data: { id: "12345" },
      }),
    ).toMatchObject({
      id: "notif-1",
      type: "payment",
      data: { id: "12345" },
    });
  });

  it("resolves payment outcomes", () => {
    expect(resolveMercadoPagoPaymentOutcome("approved")).toBe("approved");
    expect(resolveMercadoPagoPaymentOutcome("rejected")).toBe("rejected");
    expect(resolveMercadoPagoPaymentOutcome("cancelled")).toBe("cancelled");
    expect(resolveMercadoPagoPaymentOutcome("refunded")).toBe("refunded");
    expect(resolveMercadoPagoPaymentOutcome("pending")).toBe("pending");
  });

  it("validates webhook signatures with lowercase data ids", () => {
    const secret = "test-webhook-secret";
    const ts = "1704908010";
    const requestId = "req-123";
    const dataId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
    const manifest = buildMercadoPagoWebhookManifest({
      dataId,
      requestId,
      ts,
    });
    const v1 = computeMercadoPagoWebhookSignature(manifest, secret);
    const headers = new Headers({
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    });

    const auth = authorizeMercadoPagoWebhook(headers, dataId, { expectedSecret: secret });
    expect(auth).toEqual({ ok: true });
  });

  it("rejects invalid webhook signatures", () => {
    const headers = new Headers({
      "x-signature": "ts=1704908010,v1=deadbeef",
      "x-request-id": "req-123",
    });

    const auth = authorizeMercadoPagoWebhook(headers, "12345", {
      expectedSecret: "test-webhook-secret",
    });
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.status).toBe(401);
    }
  });
});
