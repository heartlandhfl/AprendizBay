import { afterEach, describe, expect, it, vi } from "vitest";

describe("email locale", () => {
  afterEach(() => {
    delete process.env.EMAIL_LOCALE;
  });

  it("defaults to pt-BR for Brazilian Portuguese emails", async () => {
    vi.resetModules();
    const { EMAIL_LOCALE, EMAIL_HTML_LANG } = await import("@/lib/email/locale");
    expect(EMAIL_LOCALE).toBe("pt-BR");
    expect(EMAIL_HTML_LANG).toBe("pt-BR");
  });

  it("honors EMAIL_LOCALE when set", async () => {
    process.env.EMAIL_LOCALE = "pt-BR";
    vi.resetModules();
    const { EMAIL_LOCALE } = await import("@/lib/email/locale");
    expect(EMAIL_LOCALE).toBe("pt-BR");
  });
});
