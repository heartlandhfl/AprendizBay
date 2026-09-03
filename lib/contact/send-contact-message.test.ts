import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendContactMessage,
  validateContactForm,
} from "@/lib/contact/send-contact-message";
import {
  getActiveEmailProvider,
  setActiveEmailProvider,
} from "@/lib/email/resend-sendgrid-provider";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

describe("validateContactForm", () => {
  it("rejects missing fields", () => {
    expect(validateContactForm({ name: "", email: "", message: "" })).toEqual({
      ok: false,
      status: 400,
      error: "Preencha nome, e-mail e mensagem.",
    });
  });

  it("rejects invalid email", () => {
    expect(
      validateContactForm({ name: "Ana", email: "invalid", message: "Olá" }),
    ).toEqual({
      ok: false,
      status: 400,
      error: "Informe um e-mail válido.",
    });
  });

  it("accepts valid input", () => {
    expect(
      validateContactForm({
        name: "Ana",
        email: "ana@example.com",
        message: "Preciso de ajuda",
      }),
    ).toBeNull();
  });
});

describe("sendContactMessage", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setActiveEmailProvider(null);
    vi.restoreAllMocks();
  });

  it("sends contact mail to the support inbox in production", async () => {
    process.env.EMAIL_ENV = "production";
    process.env.EMAIL_PROVIDER = "jetsend";
    process.env.JETSEND_API_KEY = "test-key";
    process.env.JETSEND_FROM_EMAIL = "Aprendiz Bay <noreply@aprendizbay.com.br>";

    const send = vi.fn(async () => ({ sent: true, provider: "jetsend" as const }));
    setActiveEmailProvider({ send });

    const result = await sendContactMessage({
      name: "Ana Silva",
      email: "ana@example.com",
      message: "Tenho uma dúvida sobre pagamentos.",
    });

    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: SUPPORT_CONTACT_EMAIL,
        subject: "Contato pelo site: Ana Silva",
        text: expect.stringContaining("ana@example.com"),
        html: expect.stringContaining("Tenho uma dúvida sobre pagamentos."),
      }),
    );
  });

  it("returns a 503 when email delivery is skipped", async () => {
    const send = vi.fn(async () => ({
      sent: false,
      skipped: true,
      reason: "missing_api_key",
    }));
    setActiveEmailProvider({ send });

    const result = await sendContactMessage({
      name: "Ana Silva",
      email: "ana@example.com",
      message: "Tenho uma dúvida.",
    });

    expect(result).toEqual({
      ok: false,
      status: 503,
      error:
        "O envio por e-mail está temporariamente indisponível. Use o endereço abaixo.",
    });
  });

  it("uses the active email provider from the shared email stack", async () => {
    process.env.EMAIL_ENV = "production";
    const send = vi.fn(async () => ({ sent: true, provider: "jetsend" as const }));
    setActiveEmailProvider({ send });

    await sendContactMessage({
      name: "João",
      email: "joao@example.com",
      message: "Teste",
    });

    expect(getActiveEmailProvider().send).toBe(send);
  });
});
