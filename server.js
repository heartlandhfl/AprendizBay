"use strict";

/**
 * Hostinger Express entry. Bind PORT before loading Next.js.
 * Requiring `next` first is slow enough that LiteSpeed returns 503.
 */
if (process.env.NODE_ENV !== "development") {
  process.env.NODE_ENV = "production";
}

const express = require("express");
const path = require("path");

function getPort() {
  const raw = process.env.PORT;
  if (!raw) {
    return 3000;
  }
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

const BOOT_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="2" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aprendiz Bay</title>
  </head>
  <body style="font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafb;color:#0f172a">
    <p>Iniciando o Aprendiz Bay…</p>
  </body>
</html>`;

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

let nextHandle = null;
let nextError = null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "aprendiz-bay",
    mode: "express",
    next: nextError ? "error" : nextHandle ? "ready" : "starting",
    nextError: nextError
      ? String(nextError.stack || nextError.message || nextError).slice(0, 4000)
      : null,
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  if (nextHandle) {
    nextHandle(req, res);
    return;
  }
  if (nextError) {
    const detail = String(nextError.stack || nextError.message || nextError);
    res.status(500).type("html").send(
      `<!doctype html><meta charset="utf-8"><pre style="white-space:pre-wrap;font:14px/1.4 sans-serif;padding:24px">${detail
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`,
    );
    return;
  }
  res.status(200).type("html").send(BOOT_HTML);
});

const port = getPort();
const httpServer = app.listen(port, () => {
  console.log(`[Aprendiz Bay] Express listening on ${String(port)}`);
});

httpServer.on("error", (error) => {
  console.error("[Aprendiz Bay] listen failed:", error);
  process.exit(1);
});

setImmediate(() => {
  try {
    const { attachNext } = require(path.join(__dirname, "server", "attach-next.js"));
    Promise.resolve(attachNext(app))
      .then((handle) => {
        nextHandle = handle;
        console.log("[Aprendiz Bay] Next.js is ready");
      })
      .catch((error) => {
        nextError = error;
        console.error("[Aprendiz Bay] Next.js failed to start:", error);
      });
  } catch (error) {
    nextError = error;
    console.error("[Aprendiz Bay] Could not load Next.js bridge:", error);
  }
});
