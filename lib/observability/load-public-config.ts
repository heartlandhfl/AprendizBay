import {
  parsePublicObservabilityConfig,
  publicObservabilityConfigFromEnv,
  type PublicObservabilityConfig,
} from "@/lib/observability/config";

let cached: PublicObservabilityConfig | null = null;
let pending: Promise<PublicObservabilityConfig> | null = null;

export async function loadPublicObservabilityConfig(): Promise<PublicObservabilityConfig> {
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined") {
    cached = publicObservabilityConfigFromEnv();
    return cached;
  }

  if (!pending) {
    pending = fetch("/api/public-config")
      .then(async (response) => {
        if (!response.ok) {
          return publicObservabilityConfigFromEnv();
        }

        const data = (await response.json()) as { observability?: unknown };
        const fromApi = parsePublicObservabilityConfig(data.observability);
        return fromApi.sentryDsn || fromApi.plausibleDomain
          ? fromApi
          : publicObservabilityConfigFromEnv();
      })
      .catch(() => publicObservabilityConfigFromEnv())
      .then((config) => {
        cached = config;
        return config;
      });
  }

  return pending;
}
