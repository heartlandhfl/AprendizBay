import { afterEach, describe, expect, it, vi } from "vitest";
import { installPlausibleStub, trackEvent, trackPageview } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

describe("analytics client", () => {
  afterEach(() => {
    delete window.plausible;
  });

  it("queues events on the official Plausible stub until the script loads", () => {
    installPlausibleStub();
    trackEvent(ANALYTICS_EVENTS.signUp, { role: "student", method: "email" });

    expect(window.plausible?.q).toEqual([
      ["sign_up", { props: { role: "student", method: "email" } }],
    ]);
  });

  it("forwards events to window.plausible when it is already defined", () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent(ANALYTICS_EVENTS.search, { source: "hero", query: "Inglês" });
    trackPageview("https://www.aprendizbay.com.br/search");

    expect(plausible).toHaveBeenCalledWith("search", {
      props: { source: "hero", query: "Inglês" },
    });
    expect(plausible).toHaveBeenCalledWith("pageview", {
      u: "https://www.aprendizbay.com.br/search",
    });
  });
});
