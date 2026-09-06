import { afterEach, describe, expect, it, vi } from "vitest";

describe("legacy email provider locale", () => {
  afterEach(() => {
    delete process.env.EMAIL_LOCALE;
    delete process.env.EMAIL_ENV;
    delete process.env.RESEND_API_KEY;
    delete process.env.JET_SEND_API_KEY;
    delete process.env.JETSEND_API_KEY;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends Content-Language pt-BR on Resend requests", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_LOCALE = "pt-BR";
    process.env.EMAIL_ENV = "production";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmail } = await import("./legacy-provider.js");
    await sendEmail({
      to: "aluno@example.com",
      subject: "Teste",
      text: "Corpo",
      html: "<p>Corpo</p>",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(options.body) as { headers: Record<string, string> };
    expect(body.headers).toEqual({ "Content-Language": "pt-BR" });
  });
});
