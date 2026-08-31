const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { publicObservabilityConfig } = require("./public-config");

describe("publicObservabilityConfig", () => {
  it("returns empty keys when observability env vars are unset", () => {
    const previous = {
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
      PLAUSIBLE_DOMAIN: process.env.PLAUSIBLE_DOMAIN,
      NEXT_PUBLIC_PLAUSIBLE_SRC: process.env.NEXT_PUBLIC_PLAUSIBLE_SRC,
    };

    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    delete process.env.PLAUSIBLE_DOMAIN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;

    try {
      const config = publicObservabilityConfig();
      assert.equal(config.sentryDsn, "");
      assert.equal(config.plausibleDomain, "");
      assert.equal(config.plausibleSrc, "https://plausible.io/js/script.manual.js");
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value == null) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
