import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { buildPlausibleEventPayload } from "@/lib/analytics/server";

describe("analytics server", () => {
  it("returns null when no Plausible domain is configured", () => {
    expect(
      buildPlausibleEventPayload(
        { name: ANALYTICS_EVENTS.paymentCompleted },
        {},
      ),
    ).toBeNull();
  });

  it("builds a cookie-free Events API payload for payment_completed", () => {
    const payload = buildPlausibleEventPayload(
      {
        name: ANALYTICS_EVENTS.paymentCompleted,
        url: "https://www.aprendizbay.com.br/bookings",
        props: { booking_id: "booking-1", type: "individual" },
      },
      {
        PLAUSIBLE_DOMAIN: "aprendizbay.com.br",
        PLAUSIBLE_API_HOST: "https://plausible.io",
      },
    );

    expect(payload).toEqual({
      endpoint: "https://plausible.io/api/event",
      body: {
        name: "payment_completed",
        domain: "aprendizbay.com.br",
        url: "https://www.aprendizbay.com.br/bookings",
        props: { booking_id: "booking-1", type: "individual" },
      },
    });
  });
});
