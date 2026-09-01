import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireFirebaseApp, mockGetIdToken } = vi.hoisted(() => ({
  mockRequireFirebaseApp: vi.fn(),
  mockGetIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  auth: {
    get currentUser() {
      return { uid: "student-1", getIdToken: mockGetIdToken };
    },
  },
  db: {},
  requireFirebaseApp: mockRequireFirebaseApp,
  whenFirebaseReady: vi.fn(),
}));

vi.mock("@/lib/notifications/client", () => ({
  requestNotification: vi.fn(),
}));

import { createBooking } from "@/lib/bookings/service";

describe("createBooking client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockRequireFirebaseApp.mockReset();
    mockGetIdToken.mockReset();
    mockRequireFirebaseApp.mockResolvedValue(undefined);
    mockGetIdToken.mockResolvedValue("id-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ bookingId: "booking-1" }),
      }),
    );
  });

  it("posts tutor and slot only to POST /api/bookings", async () => {
    const scheduledAt = new Date("2026-09-08T19:00:00.000Z");
    const bookingId = await createBooking("student-1", {
      tutorId: "tutor-1",
      type: "individual",
      scheduledAt,
    });

    expect(bookingId).toBe("booking-1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer id-token",
        }),
      }),
    );

    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      tutorId: "tutor-1",
      type: "individual",
      scheduledAt: scheduledAt.toISOString(),
    });
    expect(body).not.toHaveProperty("price");
    expect(body).not.toHaveProperty("studentId");
    expect(body).not.toHaveProperty("status");
  });

  it("refuses to create a collective booking on the individual client path", async () => {
    await expect(
      createBooking("student-1", {
        tutorId: "tutor-1",
        type: "coletivo",
        scheduledAt: new Date("2026-09-08T19:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "COLLECTIVE_PATH" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
