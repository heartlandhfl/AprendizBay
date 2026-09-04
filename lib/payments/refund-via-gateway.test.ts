import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { refundViaGateway } from "@/lib/payments/refund-via-gateway";

const refundMock = vi.fn();

vi.mock("@/lib/payments/gateway/factory", () => ({
  getPaymentProvider: () => "mercadopago",
  createPaymentGateway: () => ({
    refund: refundMock,
  }),
}));

vi.mock("@/lib/payments/asaas", () => ({
  findAsaasPaymentIdByExternalReference: vi.fn(),
}));

describe("refundViaGateway", () => {
  beforeEach(() => {
    refundMock.mockReset();
    refundMock.mockResolvedValue({
      paymentId: "mp-123",
      status: "refunded",
      refundId: "ref-1",
      refundAmount: 80,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refunds using the booking payment id for Mercado Pago", async () => {
    const result = await refundViaGateway({
      bookingId: "booking-1",
      paymentId: "mp-123",
    });

    expect(refundMock).toHaveBeenCalledWith({
      paymentId: "mp-123",
      description: "Cancelamento da aula no Aprendiz Bay",
      amount: undefined,
    });
    expect(result.status).toBe("refunded");
  });
});
