import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/admin/jetsend/sending-domains/route";

const verifyAdminIdTokenMock = vi.fn();
const listSendingDomainsMock = vi.fn();
const createSendingDomainMock = vi.fn();

vi.mock("@/lib/auth/admin-server", () => ({
  verifyAdminIdToken: (...args: unknown[]) => verifyAdminIdTokenMock(...args),
}));

vi.mock("@/lib/jetsend/sending-domains", () => ({
  listSendingDomains: (...args: unknown[]) => listSendingDomainsMock(...args),
  createSendingDomain: (...args: unknown[]) => createSendingDomainMock(...args),
  validateSendingDomainInput: (value: string) =>
    value.trim() ? null : "Informe o domínio de envio.",
}));

function adminRequest(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      Authorization: "Bearer admin-token",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

describe("/api/admin/jetsend/sending-domains", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists sending domains for admins", async () => {
    verifyAdminIdTokenMock.mockResolvedValue({ uid: "admin-1" });
    listSendingDomainsMock.mockResolvedValue([
      { domain: "aprendizbay.com.br", dnsRecords: [], raw: {} },
    ]);

    const response = await GET(adminRequest("/api/admin/jetsend/sending-domains"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.domains).toHaveLength(1);
    expect(listSendingDomainsMock).toHaveBeenCalled();
  });

  it("creates a sending domain for admins", async () => {
    verifyAdminIdTokenMock.mockResolvedValue({ uid: "admin-1" });
    createSendingDomainMock.mockResolvedValue({
      domain: "aprendizbay.com.br",
      dnsRecords: [{ type: "TXT", name: "@", value: "v=spf1 include:jetsend.com ~all" }],
      raw: {},
    });

    const response = await POST(
      adminRequest("/api/admin/jetsend/sending-domains", {
        method: "POST",
        body: JSON.stringify({ domain: "aprendizbay.com.br" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.domain.domain).toBe("aprendizbay.com.br");
    expect(createSendingDomainMock).toHaveBeenCalledWith("aprendizbay.com.br");
  });
});
