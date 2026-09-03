import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jetsendRequest } from "@/lib/jetsend/client";

describe("jetsendRequest", () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends Authorization Bearer with the server-side API key", async () => {
    process.env.JET_SEND_API_KEY = "server-only-key";
    delete process.env.JETSEND_API_KEY;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await jetsendRequest({
      path: "/sending_domain",
      method: "POST",
      body: { domain: "aprendizbay.com.br" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.jetsend.com/api/v1/sending_domain",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer server-only-key",
          accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("falls back to JETSEND_API_KEY when JET_SEND_API_KEY is unset", async () => {
    delete process.env.JET_SEND_API_KEY;
    process.env.JETSEND_API_KEY = "legacy-server-key";
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await jetsendRequest({ path: "/sending_domain", method: "GET" });

    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBe(
      "Bearer legacy-server-key",
    );
  });

  it("throws when the API key is missing", async () => {
    delete process.env.JET_SEND_API_KEY;
    delete process.env.JETSEND_API_KEY;

    await expect(
      jetsendRequest({ path: "/sending_domain", method: "POST", body: { domain: "example.com" } }),
    ).rejects.toMatchObject({
      name: "JetSendApiError",
      details: { code: "missing_api_key" },
    });
  });
});
