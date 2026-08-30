import type { AnalyticsProps } from "@/lib/analytics/events";

type PlausibleArgs = [string, { props?: AnalyticsProps; u?: string }?];

type PlausibleFn = ((
  event: string,
  options?: { props?: AnalyticsProps; u?: string },
) => void) & {
  q?: PlausibleArgs[];
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function installPlausibleStub(): void {
  if (typeof window === "undefined" || window.plausible) {
    return;
  }

  const plausible: PlausibleFn = function plausible(...args: PlausibleArgs) {
    (plausible.q = plausible.q || []).push(args);
  };
  window.plausible = plausible;
}

export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") {
    return;
  }

  installPlausibleStub();
  window.plausible?.(name, props ? { props } : undefined);
}

export function trackPageview(url?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  installPlausibleStub();
  window.plausible?.("pageview", url ? { u: url } : undefined);
}
