import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildResendSendRequest,
  extractResendMessageId,
  isResendConfigured,
  ResendEmailError,
  ResendEmailProvider,
  resolveResendFromAddress,
} from "@/lib/email/resend-provider";
import {
  getActiveEmailProvider,
  setActiveEmailProvider,
} from "@/lib/email/resend-sendgrid-provider";

describe("resolveResendFromAddress", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers an explicit from value", () => {
    process.env.RESEND_FROM = "resend@example.com";
    process.env.EMAIL_FROM = "other@example.com";
    expect(resolveResendFromAddress("explicit@example.com")).toBe("explicit@example.com");
  });

  it("uses RESEND_FROM when no explicit from is provided", () => {
    process.env.RESEND_FROM = "Aprendiz Bay <noreply@aprendizbay.com.br>";
    process.env.EMAIL_FROM = "other@example.com";
    expect(resolveResendFromAddress()).toBe("Aprendiz Bay <noreply@aprendizbay.com.br>");
  });
});

describe("buildResendSendRequest", () => {
  it("includes html, text, subject, and from address", () => {
    const request = buildResendSendRequest(
      {
        to: "student@example.com",
        subject: "Sua aula foi confirmada",
        text: "Texto simples",
        html: "<p>HTML</p>",
      },
      "Aprendiz Bay <noreply@aprendizbay.com.br>",
    );

    expect(request).toMatchObject({
      from: "Aprendiz Bay <noreply@aprendizbay.com.br>",
      to: ["student@example.com"],
      subject: "Sua aula foi confirmada",
      text: "Texto simples",
      html: "<p>HTML</p>",
    });
  });

  it("includes emailOutboxId as a Resend tag for webhook correlation", () => {
    const request = buildResendSendRequest(
      {
        to: "student@example.com",
        subject: "Sua aula foi confirmada",
        text: "Texto simples",
        html: "<p>HTML</p>",
        emailOutboxId: "outbox-123",
      },
      "Aprendiz Bay <noreply@aprendizbay.com.br>",
    );

    expect(request.tags).toEqual([{ name: "emailOutboxId", value: "outbox-123" }]);
  });
});

describe("extractResendMessageId", () => {
  it("reads the id field from the Resend response", () => {
    expect(extractResendMessageId({ id: "email-123" })).toBe("email-123");
  });
});

describe("ResendEmailProvider", () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EMAIL_ENV: "production",
      RESEND_API_KEY: "re_test_key",
      RESEND_FROM: "Aprendiz Bay <noreply@aprendizbay.com.br>",
    };
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("sends a successful Resend transmission", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "email-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const provider = new ResendEmailProvider();
    const result = await provider.send({
      to: "student@example.com",
      subject: "Sua aula foi confirmada",
      text: "Corpo em texto",
      html: "<p>Corpo em HTML</p>",
    });

    expect(result).toEqual({
      sent: true,
      provider: "resend",
      providerMessageId: "email-123",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      from: "Aprendiz Bay <noreply@aprendizbay.com.br>",
      to: ["student@example.com"],
      subject: "Sua aula foi confirmada",
      text: "Corpo em texto",
      html: "<p>Corpo em HTML</p>",
    });
  });

  it("skips when the API key is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const provider = new ResendEmailProvider();
    const result = await provider.send({
      to: "student@example.com",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
    });

    expect(result).toEqual({
      sent: false,
      skipped: true,
      reason: "missing_api_key",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a structured error when Resend rejects the request", async () => {
    fetchMock.mockResolvedValue(
      new Response("invalid sender", {
        status: 422,
      }),
    );

    const provider = new ResendEmailProvider();

    await expect(
      provider.send({
        to: "student@example.com",
        subject: "Teste",
        text: "texto",
        html: "<p>html</p>",
      }),
    ).rejects.toMatchObject({
      name: "ResendEmailError",
      details: {
        code: "resend_api_error",
        status: 422,
        body: "invalid sender",
      },
    });
  });
});

describe("getActiveEmailProvider with Resend primary", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setActiveEmailProvider(null);
    vi.unstubAllGlobals();
  });

  it("selects ResendEmailProvider by default when RESEND_API_KEY is set", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.EMAIL_ENV = "production";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Aprendiz Bay <noreply@aprendizbay.com.br>";
    process.env.JETSEND_API_KEY = "jetsend-legacy-key";
    setActiveEmailProvider(null);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-456" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = getActiveEmailProvider();
    const result = await provider.send({
      to: "student@example.com",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
    });

    expect(result).toEqual({
      sent: true,
      provider: "resend",
      providerMessageId: "email-456",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.resend.com/emails");
  });

  it("prefers Resend over JetSend when both keys are configured", async () => {
    delete process.env.EMAIL_PROVIDER;
    process.env.EMAIL_ENV = "production";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Aprendiz Bay <noreply@aprendizbay.com.br>";
    process.env.JETSEND_API_KEY = "jetsend-legacy-key";
    setActiveEmailProvider(null);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-789" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = getActiveEmailProvider();
    await provider.send({
      to: "student@example.com",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.resend.com/emails");
  });
});

describe("isResendConfigured", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns true when RESEND_API_KEY is set", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(isResendConfigured()).toBe(true);
  });
});
