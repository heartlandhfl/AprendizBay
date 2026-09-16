import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfinitePayGateway } from "@/lib/payments/gateway/infinitepay-gateway";

const checkInfinitePayPayment = vi.fn();
const createInfinitePayCheckoutLink = vi.fn();

vi.mock("@/lib/payments/infinitepay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/infinitepay")>();
  return {
    ...actual,
    checkInfinitePayPayment: (...args: unknown[]) => checkInfinitePayPayment(...args),
    createInfinitePayCheckoutLink: (...args: unknown[]) => createInfinitePayCheckoutLink(...args),
    getInfinitePayHandle: () => "aprendizbay",
    authorizeInfinitePayWebhook: () => ({ ok: true }),
  };
});

describe("InfinitePayGateway", () => {
  const gateway = new InfinitePayGateway();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFINITEPAY_HANDLE = "aprendizbay";
  });

  afterEach(() => {
    delete process.env.INFINITEPAY_HANDLE;
  });

  it("creates a hosted checkout link using booking id as order_nsu", async () => {
    createInfinitePayCheckoutLink.mockResolvedValue({
      checkoutUrl: "https://checkout.infinitepay.io/aprendizbay/abc123",
      slug: "abc123",
    });

    const result = await gateway.createCheckout({
      bookingId: "booking-123",
      itemName: "Aula Individual",
      itemDescription: "Pagamento da aula individual no Aprendiz Bay",
      amount: 80,
      customer: {
        name: "Aluno",
        email: "aluno@example.com",
      },
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      notificationUrl: "https://example.com/api/payments/webhook/infinitepay",
    });

    expect(createInfinitePayCheckoutLink).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNsu: "booking-123",
        redirectUrl: "https://example.com/success",
        webhookUrl: "https://example.com/api/payments/webhook/infinitepay",
      }),
    );
    expect(result).toEqual({
      checkoutId: "abc123",
      checkoutUrl: "https://checkout.infinitepay.io/aprendizbay/abc123",
      status: "checkout_created",
    });
  });

  it("verifies webhook payloads with payment_check before confirming", async () => {
    checkInfinitePayPayment.mockResolvedValue({
      success: true,
      paid: true,
      paidAmount: 8000,
      amount: 8000,
    });

    const request = new Request("https://example.com/api/payments/webhook/infinitepay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoice_slug: "abc123",
        amount: 8000,
        paid_amount: 8000,
        transaction_nsu: "txn-uuid",
        order_nsu: "booking-123",
        capture_method: "pix",
      }),
    });

    const verification = await gateway.verifyWebhook(request);

    expect(verification.ok).toBe(true);
    if (verification.ok) {
      expect(verification.event).toMatchObject({
        kind: "payment_update",
        status: "paid",
        bookingId: "booking-123",
        paymentId: "txn-uuid",
        checkoutId: "abc123",
        paidAmount: 80,
      });
    }
    expect(checkInfinitePayPayment).toHaveBeenCalledWith({
      orderNsu: "booking-123",
      transactionNsu: "txn-uuid",
      slug: "abc123",
    });
  });
});
