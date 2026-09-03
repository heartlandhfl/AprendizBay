import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JetSendEmailError,
  JetSendEmailProvider,
  buildJetSendTransmissionRequest,
  isValidEmailAddress,
  parseFromAddress,
  resolveJetSendFromAddress,
} from "@/lib/email/jetsend-provider";
import {
  getActiveEmailProvider,
  setActiveEmailProvider,
} from "@/lib/email/resend-sendgrid-provider";

describe("parseFromAddress", () => {
  it("parses a display name and email", () => {
    expect(parseFromAddress('Aprendiz Bay <noreply@aprendizbay.com.br>')).toEqual({
      name: "Aprendiz Bay",
      email: "noreply@aprendizbay.com.br",
    });
  });

  it("parses a bare email", () => {
    expect(parseFromAddress("noreply@aprendizbay.com.br")).toEqual({
      email: "noreply@aprendizbay.com.br",
    });
  });
});

describe("resolveJetSendFromAddress", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers an explicit from value", () => {
    process.env.JETSEND_FROM_EMAIL = "jetsend@example.com";
    process.env.EMAIL_FROM = "other@example.com";
    expect(resolveJetSendFromAddress("explicit@example.com")).toBe("explicit@example.com");
  });

  it("uses JETSEND_FROM_EMAIL when no explicit from is provided", () => {
    process.env.JETSEND_FROM_EMAIL = "jetsend@example.com";
    process.env.EMAIL_FROM = "other@example.com";
    expect(resolveJetSendFromAddress()).toBe("jetsend@example.com");
  });
});

describe("buildJetSendTransmissionRequest", () => {
  it("includes html, text, subject, and from address", () => {
    const request = buildJetSendTransmissionRequest(
      {
        to: "student@example.com",
        subject: "Sua aula foi confirmada",
        text: "Texto simples",
        html: "<p>HTML</p>",
      },
      "Aprendiz Bay <noreply@aprendizbay.com.br>",
    );

    expect(request.email.content).toMatchObject({
      subject: "Sua aula foi confirmada",
      html: "<p>HTML</p>",
      text: "Texto simples",
      from: {
        name: "Aprendiz Bay",
        email: "noreply@aprendizbay.com.br",
      },
    });
    expect(request.email.recipients[0]?.address).toEqual({
      email: "student@example.com",
      name: "student",
    });
  });
});

describe("JetSendEmailProvider", () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JETSEND_API_KEY: "test-jetsend-key",
      JETSEND_FROM_EMAIL: "Aprendiz Bay <noreply@aprendizbay.com.br>",
    };
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("sends a successful JetSend transmission", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const provider = new JetSendEmailProvider();
    const result = await provider.send({
      to: "student@example.com",
      subject: "Sua aula foi confirmada",
      text: "Corpo em texto",
      html: "<p>Corpo em HTML</p>",
    });

    expect(result).toEqual({ sent: true, provider: "jetsend" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.jetsend.com/api/v1/transmission/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-jetsend-key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body.email.content).toMatchObject({
      subject: "Sua aula foi confirmada",
      text: "Corpo em texto",
      html: "<p>Corpo em HTML</p>",
      from: {
        name: "Aprendiz Bay",
        email: "noreply@aprendizbay.com.br",
      },
    });
  });

  it("skips when the API key is missing", async () => {
    delete process.env.JETSEND_API_KEY;

    const provider = new JetSendEmailProvider();
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

  it("throws a structured error when JetSend rejects the request", async () => {
    fetchMock.mockResolvedValue(
      new Response("invalid sender", {
        status: 422,
      }),
    );

    const provider = new JetSendEmailProvider();

    await expect(
      provider.send({
        to: "student@example.com",
        subject: "Teste",
        text: "texto",
        html: "<p>html</p>",
      }),
    ).rejects.toMatchObject({
      name: "JetSendEmailError",
      details: {
        code: "jetsend_api_error",
        status: 422,
        body: "invalid sender",
      },
    });
  });

  it("skips invalid recipients", async () => {
    const provider = new JetSendEmailProvider();
    const result = await provider.send({
      to: "not-an-email",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
    });

    expect(result).toEqual({
      sent: false,
      skipped: true,
      reason: "invalid_recipient",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isValidEmailAddress("not-an-email")).toBe(false);
  });

  it("skips missing recipients", async () => {
    const provider = new JetSendEmailProvider();
    const result = await provider.send({
      to: "   ",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
    });

    expect(result).toMatchObject({
      sent: false,
      skipped: true,
      reason: "missing_recipient",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the configured from address", async () => {
    process.env.JETSEND_FROM_EMAIL = "staging@aprendizbay.com.br";
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const provider = new JetSendEmailProvider();
    await provider.send({
      to: "student@example.com",
      subject: "Teste",
      text: "texto",
      html: "<p>html</p>",
      from: "Override <override@example.com>",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.email.content.from).toEqual({
      name: "Override",
      email: "override@example.com",
    });
  });

  it("throws a structured network error when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const provider = new JetSendEmailProvider();

    await expect(
      provider.send({
        to: "student@example.com",
        subject: "Teste",
        text: "texto",
        html: "<p>html</p>",
      }),
    ).rejects.toBeInstanceOf(JetSendEmailError);
  });
});

describe("getActiveEmailProvider", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setActiveEmailProvider(null);
  });

  it("selects JetSendEmailProvider when EMAIL_PROVIDER=jetsend", () => {
    process.env.EMAIL_PROVIDER = "jetsend";
    setActiveEmailProvider(null);

    const provider = getActiveEmailProvider();
    expect(provider).toBeInstanceOf(JetSendEmailProvider);
  });

  it("keeps the legacy provider as the default fallback", () => {
    delete process.env.EMAIL_PROVIDER;
    setActiveEmailProvider(null);

    const provider = getActiveEmailProvider();
    expect(provider.constructor.name).toBe("ResendSendGridEmailProvider");
  });
});
