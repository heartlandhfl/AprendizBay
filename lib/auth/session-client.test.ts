import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { establishAuthSession } from "@/lib/auth/session-client";

describe("establishAuthSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("forces an ID token refresh before creating the session cookie", async () => {
    const getIdToken = vi
      .fn()
      .mockResolvedValueOnce("fresh-token")
      .mockResolvedValueOnce("stale-token");
    const user = { getIdToken } as unknown as User;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await establishAuthSession(user);

    expect(getIdToken).toHaveBeenNthCalledWith(1, true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer fresh-token",
        },
      }),
    );
  });
});
