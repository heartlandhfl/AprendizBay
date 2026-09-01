const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { publicFirebaseConfig, publicObservabilityConfig } = require("./public-config");

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

describe("public config secrets", () => {
  it("never exposes the Asaas webhook token to the browser", () => {
    const previous = process.env.ASAAS_WEBHOOK_TOKEN;
    process.env.ASAAS_WEBHOOK_TOKEN = "asaas-webhook-secret-must-stay-server-only";

    try {
      const firebase = publicFirebaseConfig();
      const observability = publicObservabilityConfig();
      const serialized = JSON.stringify({ firebase, observability });

      assert.equal(serialized.includes("asaas-webhook-secret-must-stay-server-only"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(firebase, "asaasWebhookToken"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(observability, "asaasWebhookToken"), false);
    } finally {
      if (previous == null) {
        delete process.env.ASAAS_WEBHOOK_TOKEN;
      } else {
        process.env.ASAAS_WEBHOOK_TOKEN = previous;
      }
    }
  });
});

describe("publicFirebaseConfig", () => {
  it("never exposes Firebase Admin credentials to the browser", () => {
    const previous = {
      FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    };

    process.env.FIREBASE_ADMIN_PROJECT_ID = "secret-admin-project";
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "admin@secret.iam.gserviceaccount.com";
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----FAKE";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "public-browser-key";

    try {
      const config = publicFirebaseConfig();
      const serialized = JSON.stringify(config);

      assert.deepEqual(Object.keys(config).sort(), [
        "apiKey",
        "appId",
        "authDomain",
        "messagingSenderId",
        "projectId",
        "storageBucket",
      ]);
      assert.equal(config.apiKey, "public-browser-key");
      assert.equal(serialized.includes("PRIVATE KEY"), false);
      assert.equal(serialized.includes("iam.gserviceaccount.com"), false);
      assert.equal(serialized.includes("secret-admin-project"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(config, "privateKey"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(config, "clientEmail"), false);
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
