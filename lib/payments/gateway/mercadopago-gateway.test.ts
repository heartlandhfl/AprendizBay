import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __mercadopagoGatewayTestUtils,
  MercadoPagoGateway,
} from "@/lib/payments/gateway/mercadopago-gateway";

const preferenceCreate = vi.fn();
const paymentGet = vi.fn();
const refundTotal = vi.fn();
const refundCreate = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn().mockImplementation(function Preference() {
    return { create: preferenceCreate };
  }),
  Payment: vi.fn().mockImplementation(function Payment() {
    return { get: paymentGet };
  }),
  PaymentRefund: vi.fn().mockImplementation(function PaymentRefund() {
    return { total: refundTotal, create: refundCreate };
  }),
}));

describe("MercadoPagoGateway status mapping", () => {
  it("maps provider statuses to internal PaymentStatus values", () => {
    const { mapMercadoPagoStatus, mapPreferenceLifecycle } = __mercadopagoGatewayTestUtils;

    expect(mapMercadoPagoStatus("approved")).toBe("paid");
    expect(mapMercadoPagoStatus("pending")).toBe("pending");
    expect(mapMercadoPagoStatus("rejected")).toBe("failed");
    expect(mapMercadoPagoStatus("cancelled")).toBe("cancelled");
    expect(mapMercadoPagoStatus("refunded")).toBe("refunded");

    expect(mapPreferenceLifecycle("closed")).toBe("checkout_created");
    expect(mapPreferenceLifecycle("expired")).toBe("expired");
  });
});

describe("MercadoPagoGateway", () => {
  const gateway = new MercadoPagoGateway("TEST_ACCESS_TOKEN");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "mp-secret";
  });

  it("creates a hosted Checkout Pro preference", async () => {
    preferenceCreate.mockResolvedValue({
      id: "pref-1",
      init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1",
      status: "closed",
    });

    const result = await gateway.createCheckout({
      bookingId: "booking-1",
      itemName: "Aula Individual",
      amount: 80,
      customer: {
        name: "Aluno",
        email: "aluno@example.com",
        cpfCnpj: "39053344705",
      },
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      notificationUrl: "https://example.com/api/mercadopago/webhook",
    });

    expect(preferenceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          external_reference: "booking-1",
          notification_url: "https://example.com/api/mercadopago/webhook",
        }),
      }),
    );
    expect(result).toEqual({
      checkoutId: "pref-1",
      checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1",
      status: "checkout_created",
    });
  });

  it("returns normalized payment status", async () => {
    paymentGet.mockResolvedValue({
      id: "123",
      status: "approved",
      external_reference: "booking-1",
      transaction_amount: 80,
    });

    const result = await gateway.getPaymentStatus("123");
    expect(result).toEqual({
      paymentId: "123",
      status: "paid",
      bookingId: "booking-1",
      amount: 80,
    });
  });

  it("issues a full refund through the SDK", async () => {
    refundTotal.mockResolvedValue({ id: 99, amount: 80 });

    const result = await gateway.refund({ paymentId: "123" });
    expect(refundTotal).toHaveBeenCalledWith({ payment_id: "123" });
    expect(result).toEqual({
      paymentId: "123",
      status: "refunded",
      refundId: "99",
      refundAmount: 80,
    });
  });
});
