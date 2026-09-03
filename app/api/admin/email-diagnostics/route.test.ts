import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/email-diagnostics/route";

const verifyAdminIdTokenMock = vi.fn();

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: (...args: unknown[]) => verifyAdminIdTokenMock(...args),
}));

function adminRequest(): Request {
  return new Request("http://localhost/api/admin/email-diagnostics", {
    headers: { Authorization: "Bearer admin-token" },
  });
}

describe("GET /api/admin/email-diagnostics", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("returns email diagnostics for admins", async () => {
    verifyAdminIdTokenMock.mockResolvedValue({ uid: "admin-1" });
    process.env.EMAIL_PROVIDER = "jetsend";
    process.env.JET_SEND_API_KEY = "abcd-secret-key";
    process.env.EMAIL_ENV = "staging";
    process.env.VERCEL_ENV = "preview";
    process.env.APRENDIZ_RUNTIME = "express";

    const response = await GET(adminRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      emailProvider: "jetsend",
      jetsendConfigured: true,
      jetsendKeyPrefix: "abcd",
      resolvedEmailEnv: "staging",
      vercelEnv: "preview",
      runtime: "express",
    });
  });

  it("rejects unauthenticated requests", async () => {
    verifyAdminIdTokenMock.mockRejectedValue(new Error("Token inválido."));

    const response = await GET(adminRequest());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Token inválido.");
  });
});
