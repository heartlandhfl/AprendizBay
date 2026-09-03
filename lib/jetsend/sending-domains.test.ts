import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSendingDomain,
  normalizeSendingDomainResponse,
  validateSendingDomainInput,
} from "@/lib/jetsend/sending-domains";

describe("validateSendingDomainInput", () => {
  it("accepts a valid domain", () => {
    expect(validateSendingDomainInput("aprendizbay.com.br")).toBeNull();
  });

  it("rejects invalid domains", () => {
    expect(validateSendingDomainInput("not a domain")).toBeTruthy();
  });
});

describe("normalizeSendingDomainResponse", () => {
  it("extracts DNS records from common JetSend response shapes", () => {
    const normalized = normalizeSendingDomainResponse(
      {
        domain: "aprendizbay.com.br",
        status: "pending",
        dns_records: [
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none" },
          { type: "CNAME", name: "track", value: "tracking.jetsend.com" },
        ],
      },
      "aprendizbay.com.br",
    );

    expect(normalized.domain).toBe("aprendizbay.com.br");
    expect(normalized.dnsRecords).toEqual([
      { type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none" },
      { type: "CNAME", name: "track", value: "tracking.jetsend.com" },
    ]);
  });
});

describe("createSendingDomain", () => {
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
  });

  it("posts the domain to the JetSend sending_domain endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          domain: "aprendizbay.com.br",
          dns_records: [{ type: "TXT", host: "@", value: "v=spf1 include:jetsend.com ~all" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    process.env.JET_SEND_API_KEY = "server-only-key";

    const created = await createSendingDomain("https://aprendizbay.com.br/");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.jetsend.com/api/v1/sending_domain",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer server-only-key",
        }),
        body: JSON.stringify({ domain: "aprendizbay.com.br" }),
      }),
    );
    expect(created.domain).toBe("aprendizbay.com.br");
    expect(created.dnsRecords.length).toBeGreaterThan(0);
  });
});
