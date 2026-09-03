import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyEmailEnvironmentGuards,
  resolveEmailEnv,
  resolveJetSendTransmissionApiUrl,
  wrapEmailProviderWithEnvironmentGuards,
} from "@/lib/email/environment.js";

const sampleMessage = {
  to: "student@example.com",
  subject: "Sua aula foi confirmada",
  text: "Corpo em texto",
  html: "<p>Corpo em HTML</p>",
};

describe("resolveEmailEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers EMAIL_ENV when set", () => {
    process.env.EMAIL_ENV = "staging";
    delete process.env.VERCEL_ENV;
    expect(resolveEmailEnv()).toBe("staging");
  });

  it("falls back to VERCEL_ENV preview as staging", () => {
    delete process.env.EMAIL_ENV;
    process.env.VERCEL_ENV = "preview";
    expect(resolveEmailEnv()).toBe("staging");
  });

  it("defaults to development when unset", () => {
    delete process.env.EMAIL_ENV;
    delete process.env.VERCEL_ENV;
    expect(resolveEmailEnv()).toBe("development");
  });
});

describe("applyEmailEnvironmentGuards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("passes through production messages unchanged", () => {
    process.env.EMAIL_ENV = "production";

    const guarded = applyEmailEnvironmentGuards(sampleMessage);
    expect(guarded.skipped).toBeUndefined();
    expect(guarded.message).toEqual(sampleMessage);
  });

  it("redirects development messages to EMAIL_TEST_RECIPIENT with a TEST label", () => {
    process.env.EMAIL_ENV = "development";
    process.env.EMAIL_TEST_RECIPIENT = "dev-inbox@example.com";

    const guarded = applyEmailEnvironmentGuards(sampleMessage);

    expect(guarded.skipped).toBeUndefined();
    expect(guarded.message.to).toBe("dev-inbox@example.com");
    expect(guarded.message.subject).toBe("[TEST] Sua aula foi confirmada");
    expect(guarded.message.text).toContain("Destinatário original: student@example.com");
    expect(guarded.message.html).toContain("student@example.com");
  });

  it("blocks development sends when EMAIL_TEST_RECIPIENT is missing", () => {
    process.env.EMAIL_ENV = "development";
    delete process.env.EMAIL_TEST_RECIPIENT;

    const guarded = applyEmailEnvironmentGuards(sampleMessage);

    expect(guarded.skipped).toEqual({
      sent: false,
      skipped: true,
      reason: "missing_test_recipient",
    });
  });

  it("redirects staging messages to the test inbox unless allowlisted", () => {
    process.env.EMAIL_ENV = "staging";
    process.env.EMAIL_TEST_RECIPIENT = "staging-inbox@example.com";
    process.env.EMAIL_STAGING_ALLOWLIST = "qa@example.com";

    const guarded = applyEmailEnvironmentGuards(sampleMessage);

    expect(guarded.message.to).toBe("staging-inbox@example.com");
    expect(guarded.message.subject).toBe("[STAGING] Sua aula foi confirmada");
  });

  it("allows staging allowlisted recipients while still labeling the email", () => {
    process.env.EMAIL_ENV = "staging";
    process.env.EMAIL_TEST_RECIPIENT = "staging-inbox@example.com";
    process.env.EMAIL_STAGING_ALLOWLIST = "qa@example.com";

    const guarded = applyEmailEnvironmentGuards({
      ...sampleMessage,
      to: "qa@example.com",
    });

    expect(guarded.message.to).toBe("qa@example.com");
    expect(guarded.message.subject).toBe("[STAGING] Sua aula foi confirmada");
    expect(guarded.message.text).not.toContain("Destinatário original");
  });
});

describe("resolveJetSendTransmissionApiUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the staging override when configured", () => {
    process.env.EMAIL_ENV = "staging";
    process.env.JETSEND_STAGING_API_URL = "https://staging.jetsend.com/api/v1/transmission/email";

    expect(resolveJetSendTransmissionApiUrl()).toBe(
      "https://staging.jetsend.com/api/v1/transmission/email",
    );
  });

  it("prefers JETSEND_TRANSMISSION_API_URL when explicitly set", () => {
    process.env.JETSEND_TRANSMISSION_API_URL = "https://custom.example.com/email";

    expect(resolveJetSendTransmissionApiUrl()).toBe("https://custom.example.com/email");
  });
});

describe("wrapEmailProviderWithEnvironmentGuards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("applies guards before delegating to the inner provider", async () => {
    process.env.EMAIL_ENV = "development";
    process.env.EMAIL_TEST_RECIPIENT = "dev-inbox@example.com";

    const send = vi.fn(async () => ({ sent: true, provider: "jetsend" as const }));
    const provider = wrapEmailProviderWithEnvironmentGuards({ send });

    await provider.send(sampleMessage);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dev-inbox@example.com",
        subject: "[TEST] Sua aula foi confirmada",
      }),
    );
  });
});
