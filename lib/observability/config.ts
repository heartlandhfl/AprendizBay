import type { EnvRecord } from "@/lib/env";

export const DEFAULT_PLAUSIBLE_SRC = "https://plausible.io/js/script.manual.js";
export const DEFAULT_PLAUSIBLE_API_HOST = "https://plausible.io";

export interface PublicObservabilityConfig {
  sentryDsn: string;
  sentryEnvironment: string;
  plausibleDomain: string;
  plausibleSrc: string;
}

export function trimConfigValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function publicObservabilityConfigFromEnv(
  env: EnvRecord = process.env,
): PublicObservabilityConfig {
  return {
    sentryDsn: trimConfigValue(env.NEXT_PUBLIC_SENTRY_DSN),
    sentryEnvironment:
      trimConfigValue(
        env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || env.SENTRY_ENVIRONMENT || env.NODE_ENV,
      ) || "production",
    plausibleDomain: trimConfigValue(
      env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || env.PLAUSIBLE_DOMAIN,
    ),
    plausibleSrc: trimConfigValue(env.NEXT_PUBLIC_PLAUSIBLE_SRC) || DEFAULT_PLAUSIBLE_SRC,
  };
}

export function parsePublicObservabilityConfig(
  value: unknown,
): PublicObservabilityConfig {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    sentryDsn: trimConfigValue(data.sentryDsn),
    sentryEnvironment: trimConfigValue(data.sentryEnvironment) || "production",
    plausibleDomain: trimConfigValue(data.plausibleDomain),
    plausibleSrc: trimConfigValue(data.plausibleSrc) || DEFAULT_PLAUSIBLE_SRC,
  };
}

export function serverSentryDsn(env: EnvRecord = process.env): string {
  return trimConfigValue(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN);
}

export function serverPlausibleDomain(env: EnvRecord = process.env): string {
  return trimConfigValue(env.PLAUSIBLE_DOMAIN || env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);
}

export function serverPlausibleApiHost(env: EnvRecord = process.env): string {
  return (
    trimConfigValue(env.PLAUSIBLE_API_HOST) || DEFAULT_PLAUSIBLE_API_HOST
  ).replace(/\/$/, "");
}
