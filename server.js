"use strict";

/**
 * Hostinger Express entry. Bind PORT immediately and never load the Next.js
 * runtime in production — `require("next")` / `prepare()` OOMs LiteSpeed and
 * yields 503 for every route, including /api/health.
 *
 * Production UI is the committed prerender in hostinger-next/, served as
 * static files. `npm run dev` still uses Next.js.
 */
if (process.env.NODE_ENV !== "development") {
  process.env.NODE_ENV = "production";
}

try {
  require("dotenv").config({ path: require("path").join(__dirname, ".env.local") });
} catch {
  // dotenv is a devDependency; Hostinger/Vercel use panel environment variables.
}

const { installNextRequireGuard } = require("./server/next-runtime-guard");
installNextRequireGuard();

const express = require("express");
const path = require("path");
const fs = require("fs");
const { apiRouter } = require("./server/api");
const { isFirebaseAdminInitialized } = require("./server/api/firebase-admin");
const { attachSentry } = require("./server/api/sentry");
const {
  attachStaticUi,
  resolveAppDir,
  DIST_DIR,
} = require("./server/serve-static-ui");

function getPort() {
  const raw = process.env.PORT;
  if (!raw) {
    return 3000;
  }
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

const MISSING_BUILD_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aprendiz Bay</title>
  </head>
  <body style="font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafb;color:#0f172a">
    <p>UI build ausente. Rode <code>npm run build</code> e faça commit de <code>hostinger-next/</code>.</p>
  </body>
</html>`;

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
// Parse JSON only on Express-owned API routers (see server/api). Leave the
// raw body intact for Next.js App Router routes such as /api/payments/*.

const dev = process.env.NODE_ENV === "development";
let uiMode = "starting";
let uiError = null;
let nextHandle = null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "aprendiz-bay",
    mode: "express",
    next: uiError ? "error" : nextHandle ? "ready" : uiMode,
    nextRuntime: dev ? Boolean(nextHandle) : false,
    firebaseAdminRuntime: isFirebaseAdminInitialized(),
    nextError: uiError
      ? String(uiError.stack || uiError.message || uiError).slice(0, 4000)
      : null,
    firebaseConfigured: Boolean(
      String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
    ),
  });
});

app.use("/api", apiRouter);
attachSentry(app);

if (!dev) {
  try {
    const appDir = resolveAppDir();
    const buildId = path.join(appDir, DIST_DIR, "BUILD_ID");
    if (fs.existsSync(buildId)) {
      attachStaticUi(app, appDir);
      uiMode = "static";
      console.log(`[Aprendiz Bay] Serving static UI from ${DIST_DIR}/`);
    } else {
      uiError = new Error(
        `Missing ${buildId}. Run "npm run build" and commit "${DIST_DIR}/".`,
      );
      uiMode = "error";
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          res.status(404).json({ error: "not found" });
          return;
        }
        res.status(500).type("html").send(MISSING_BUILD_HTML);
      });
    }
  } catch (error) {
    uiError = error;
    uiMode = "error";
    console.error("[Aprendiz Bay] Static UI setup failed:", error);
  }
} else {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      if (nextHandle) {
        nextHandle(req, res);
        return;
      }
      next();
      return;
    }
    if (nextHandle) {
      nextHandle(req, res);
      return;
    }
    if (uiError) {
      const detail = String(uiError.stack || uiError.message || uiError);
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
}

const port = getPort();
const httpServer = app.listen(port, () => {
  console.log(`[Aprendiz Bay] Express listening on ${String(port)} ui=${uiMode}`);
});

httpServer.on("error", (error) => {
  console.error("[Aprendiz Bay] listen failed:", error);
  process.exit(1);
});

if (dev) {
  setImmediate(() => {
    try {
      const { attachNext } = require(path.join(
        __dirname,
        "server",
        "attach-next.js",
      ));
      Promise.resolve(attachNext(app))
        .then((handle) => {
          nextHandle = handle;
          uiMode = "ready";
          console.log("[Aprendiz Bay] Next.js is ready");
        })
        .catch((error) => {
          uiError = error;
          uiMode = "error";
          console.error("[Aprendiz Bay] Next.js failed to start:", error);
        });
    } catch (error) {
      uiError = error;
      uiMode = "error";
      console.error("[Aprendiz Bay] Could not load Next.js bridge:", error);
    }
  });
}
