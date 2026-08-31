import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAUSIBLE_SRC,
  parsePublicObservabilityConfig,
  publicObservabilityConfigFromEnv,
  serverPlausibleDomain,
  serverSentryDsn,
} from "@/lib/observability/config";

describe("observability config", () => {
  it("reads public Sentry and Plausible keys from env", () => {
    expect(
      publicObservabilityConfigFromEnv({
        NEXT_PUBLIC_SENTRY_DSN: " https://key@o0.ingest.sentry.io/1 ",
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: "staging",
        NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "aprendizbay.com.br",
      }),
    ).toEqual({
      sentryDsn: "https://key@o0.ingest.sentry.io/1",
      sentryEnvironment: "staging",
      plausibleDomain: "aprendizbay.com.br",
      plausibleSrc: DEFAULT_PLAUSIBLE_SRC,
    });
  });

  it("does not expose a server-only Sentry DSN on the public config", () => {
    expect(
      publicObservabilityConfigFromEnv({
        SENTRY_DSN: "https://secret@o0.ingest.sentry.io/9",
      }).sentryDsn,
    ).toBe("");
    expect(
      serverSentryDsn({
        SENTRY_DSN: "https://secret@o0.ingest.sentry.io/9",
      }),
    ).toBe("https://secret@o0.ingest.sentry.io/9");
  });

  it("parses runtime public-config payloads", () => {
    expect(
      parsePublicObservabilityConfig({
        sentryDsn: "https://key@o0.ingest.sentry.io/1",
        plausibleDomain: "aprendizbay.com.br",
      }),
    ).toMatchObject({
      sentryDsn: "https://key@o0.ingest.sentry.io/1",
      plausibleDomain: "aprendizbay.com.br",
      plausibleSrc: DEFAULT_PLAUSIBLE_SRC,
    });
  });

  it("prefers PLAUSIBLE_DOMAIN for server events", () => {
    expect(
      serverPlausibleDomain({
        PLAUSIBLE_DOMAIN: "app.aprendizbay.com.br",
        NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "www.aprendizbay.com.br",
      }),
    ).toBe("app.aprendizbay.com.br");
  });
});
