import * as Sentry from "@sentry/browser";
import type { PublicObservabilityConfig } from "@/lib/observability/config";

let initializedDsn: string | null = null;

export function initClientSentry(config: PublicObservabilityConfig): void {
  if (typeof window === "undefined" || !config.sentryDsn || initializedDsn === config.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  initializedDsn = config.sentryDsn;
}

export function captureClientException(error: unknown): void {
  if (!initializedDsn) {
    return;
  }

  Sentry.captureException(error);
}
