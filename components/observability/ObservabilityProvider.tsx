"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageview } from "@/lib/analytics/client";
import { loadPublicObservabilityConfig } from "@/lib/observability/load-public-config";
import { initClientSentry } from "@/lib/observability/sentry-client";

function ensurePlausibleScript(src: string, domain: string): void {
  if (typeof document === "undefined" || !domain) {
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>("script[data-analytics='plausible']");
  if (existing) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.analytics = "plausible";
  script.dataset.domain = domain;
  script.src = src;
  document.head.appendChild(script);
}

export default function ObservabilityProvider() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    void loadPublicObservabilityConfig().then((config) => {
      if (cancelled) {
        return;
      }

      initClientSentry(config);

      if (config.plausibleDomain) {
        ensurePlausibleScript(config.plausibleSrc, config.plausibleDomain);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    void loadPublicObservabilityConfig().then((config) => {
      if (!config.plausibleDomain) {
        return;
      }

      trackPageview(
        typeof window !== "undefined" ? window.location.href : undefined,
      );
    });
  }, [pathname]);

  return null;
}
