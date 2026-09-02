import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __asaasGatewayTestUtils, AsaasGateway } from "@/lib/payments/gateway/asaas-gateway";
import * as asaas from "@/lib/payments/asaas";

describe("AsaasGateway status mapping", () => {
  it("maps checkout and payment records to internal PaymentStatus values", () => {
    const { mapCheckoutRecordStatus, mapPaymentRecordStatus, mapWebhookOutcome } =
      __asaasGatewayTestUtils;

    expect(mapCheckoutRecordStatus("ACTIVE")).toBe("checkout_created");
    expect(mapCheckoutRecordStatus("PAID")).toBe("paid");
    expect(mapCheckoutRecordStatus("EXPIRED")).toBe("expired");

    expect(mapPaymentRecordStatus("CONFIRMED")).toBe("paid");
    expect(mapPaymentRecordStatus("PENDING")).toBe("pending");
    expect(mapPaymentRecordStatus("REFUNDED")).toBe("refunded");

    expect(mapWebhookOutcome("successful")).toBe("paid");
    expect(mapWebhookOutcome("failed")).toBe("failed");
    expect(mapWebhookOutcome("expired")).toBe("expired");
    expect(mapWebhookOutcome("ignored")).toBe("pending");
  });
});

describe("AsaasGateway", () => {
  const gateway = new AsaasGateway();

  beforeEach(() => {
    process.env.ASAAS_API_KEY = "test-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates checkout through the existing Asaas client", async () => {
    vi.spyOn(asaas, "createAsaasCheckout").mockResolvedValue({
      id: "checkout-1",
      checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-1",
      status: "ACTIVE",
    });

    const result = await gateway.createCheckout({
      bookingId: "booking-1",
      itemName: "Aula Individual",
      amount: 80,
      customer: {
        name: "Aluno",
        email: "aluno@example.com",
        cpfCnpj: "39053344705",
        phone: "11999999999",
        address: "Rua A",
        addressNumber: "10",
        postalCode: "01310100",
        province: "Centro",
      },
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result).toEqual({
      checkoutId: "checkout-1",
      checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-1",
      status: "checkout_created",
    });
  });

  it("refunds and normalizes the result", async () => {
    vi.spyOn(asaas, "refundAsaasPayment").mockResolvedValue({
      paymentId: "pay_1",
      status: "REFUNDED",
      refundId: "pay_1",
      refundAmount: 80,
    });

    const result = await gateway.refund({ paymentId: "pay_1" });
    expect(result.status).toBe("refunded");
    expect(result.refundAmount).toBe(80);
  });

  it("verifies webhook and maps a paid event", async () => {
    const request = new Request("https://example.com/api/payments/webhook", {
      method: "POST",
      headers: {
        "asaas-access-token": "secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event: "PAYMENT_CONFIRMED",
        payment: {
          id: "pay_1",
          externalReference: "booking-1",
          value: 80,
          checkoutSession: "checkout-1",
        },
      }),
    });

    const result = await gateway.verifyWebhook(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event).toEqual({
        kind: "payment_update",
        status: "paid",
        bookingId: "booking-1",
        paymentId: "pay_1",
        checkoutId: "checkout-1",
        paidAmount: 80,
      });
    }
  });
});
