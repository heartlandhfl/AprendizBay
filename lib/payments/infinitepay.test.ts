import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizeInfinitePayWebhook,
  checkInfinitePayPayment,
  createInfinitePayCheckoutLink,
  parseInfinitePayWebhookPayload,
} from "@/lib/payments/infinitepay";

describe("infinitepay API helpers", () => {
  const originalHandle = process.env.INFINITEPAY_HANDLE;
  const originalToken = process.env.INFINITEPAY_WEBHOOK_TOKEN;

  beforeEach(() => {
    process.env.INFINITEPAY_HANDLE = "aprendizbay";
    delete process.env.INFINITEPAY_WEBHOOK_TOKEN;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalHandle === undefined) {
      delete process.env.INFINITEPAY_HANDLE;
    } else {
      process.env.INFINITEPAY_HANDLE = originalHandle;
    }
    if (originalToken === undefined) {
      delete process.env.INFINITEPAY_WEBHOOK_TOKEN;
    } else {
      process.env.INFINITEPAY_WEBHOOK_TOKEN = originalToken;
    }
  });

  it("creates a checkout link with booking id as order_nsu", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          checkout_url: "https://checkout.infinitepay.io/aprendizbay/abc123",
          slug: "abc123",
        }),
        { status: 200 },
      ),
    );

    const result = await createInfinitePayCheckoutLink({
      orderNsu: "booking-123",
      items: [{ quantity: 1, price: 8000, description: "Aula Individual" }],
      redirectUrl: "https://example.com/bookings?pagamento=sucesso",
      webhookUrl: "https://example.com/api/payments/webhook/infinitepay",
    });

    expect(result.checkoutUrl).toContain("checkout.infinitepay.io");
    expect(result.slug).toBe("abc123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/links",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"order_nsu":"booking-123"'),
      }),
    );
  });

  it("verifies payment status via payment_check", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          paid: true,
          amount: 8000,
          paid_amount: 8000,
          installments: 1,
          capture_method: "pix",
        }),
        { status: 200 },
      ),
    );

    const result = await checkInfinitePayPayment({
      orderNsu: "booking-123",
      transactionNsu: "txn-uuid",
      slug: "abc123",
    });

    expect(result).toMatchObject({ success: true, paid: true, paidAmount: 8000 });
  });

  it("parses approved webhook payloads", () => {
    const payload = parseInfinitePayWebhookPayload({
      invoice_slug: "abc123",
      amount: 8000,
      paid_amount: 8000,
      installments: 1,
      capture_method: "pix",
      transaction_nsu: "txn-uuid",
      order_nsu: "booking-123",
    });

    expect(payload).toMatchObject({
      order_nsu: "booking-123",
      transaction_nsu: "txn-uuid",
      invoice_slug: "abc123",
    });
  });

  it("authorizes webhook token when configured", () => {
    process.env.INFINITEPAY_WEBHOOK_TOKEN = "secret-token";

    expect(
      authorizeInfinitePayWebhook(
        new Request("https://example.com/webhook?token=secret-token", { method: "POST" }),
      ).ok,
    ).toBe(true);

    expect(
      authorizeInfinitePayWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          headers: { "x-infinitepay-webhook-token": "wrong" },
        }),
      ).ok,
    ).toBe(false);
  });
});
