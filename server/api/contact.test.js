"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const { test } = require("node:test");

require("tsx/cjs");

const { setActiveEmailProvider } = require("../../lib/email/resend-sendgrid-provider.ts");
const { contactRouter } = require("./contact.js");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test("POST /api/contact sends mail through the shared email provider", async () => {
  const previousEmailEnv = process.env.EMAIL_ENV;
  process.env.EMAIL_ENV = "production";

  const send = async (input) => {
    send.lastInput = input;
    return { sent: true, provider: "jetsend" };
  };

  setActiveEmailProvider({ send });

  const app = express();
  app.use(express.json());
  app.use("/api/contact", contactRouter);

  const { server, url } = await listen(app);

  try {
    const response = await fetch(`${url}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Maria Silva",
        email: "maria@example.com",
        message: "Teste do formulário",
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(send.lastInput.to, "contato@aprendizbay.com.br");
    assert.match(send.lastInput.subject, /Maria Silva/);
  } finally {
    server.close();
    setActiveEmailProvider(null);
    if (previousEmailEnv === undefined) {
      delete process.env.EMAIL_ENV;
    } else {
      process.env.EMAIL_ENV = previousEmailEnv;
    }
  }
});
