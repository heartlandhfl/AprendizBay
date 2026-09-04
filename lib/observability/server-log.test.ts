import { afterEach, describe, expect, it, vi } from "vitest";

const captureServerException = vi.fn();

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: (...args: unknown[]) => captureServerException(...args),
}));

import { logCriticalServerFailure } from "@/lib/observability/server-log";

describe("logCriticalServerFailure", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs structured context without undefined fields", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logCriticalServerFailure("webhook", "verification failed", {
      provider: "mercadopago",
      bookingId: "booking-1",
      detail: undefined,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[Aprendiz Bay][webhook] verification failed",
      { provider: "mercadopago", bookingId: "booking-1" },
    );
    expect(captureServerException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("captures to Sentry when requested", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logCriticalServerFailure("payment", "checkout failed", { bookingId: "b-1" }, {
      capture: true,
    });

    expect(captureServerException).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
