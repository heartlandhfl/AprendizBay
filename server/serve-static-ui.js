"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");

const DIST_DIR = "hostinger-next";

function resolveAppDir() {
  const candidates = [path.resolve(__dirname, ".."), process.cwd()];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }
  return candidates[0];
}

function safeJoin(root, ...parts) {
  const resolved = path.resolve(root, ...parts);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    return null;
  }
  return resolved;
}

function normalizePath(urlPath) {
  let pathname = urlPath || "/";
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  return pathname || "/";
}

function resolvePageFile(appOut, urlPath, rsc) {
  const ext = rsc ? ".rsc" : ".html";
  const relative =
    urlPath === "/" ? `index${ext}` : `${urlPath.replace(/^\//, "")}${ext}`;
  return safeJoin(appOut, relative);
}

/**
 * Serve the committed Next.js prerender (HTML + /_next/static) without
 * loading the Next runtime. Hostinger LiteSpeed kills the process when
 * `require("next")` / `prepare()` runs in the web worker.
 *
 * @param {import("express").Express} app
 * @param {string} appDir
 */
function attachStaticUi(app, appDir) {
  const dist = path.join(appDir, DIST_DIR);
  const appOut = path.join(dist, "server", "app");
  const staticDir = path.join(dist, "static");
  const publicDir = path.join(appDir, "public");

  if (fs.existsSync(staticDir)) {
    app.use(
      "/_next/static",
      express.static(staticDir, {
        fallthrough: false,
        immutable: true,
        maxAge: "365d",
      }),
    );
  }

  app.get("/_next/image", (req, res) => {
    const url = req.query.url;
    if (typeof url === "string" && /^https:\/\//i.test(url)) {
      res.redirect(302, url);
      return;
    }
    res.status(400).end();
  });

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, { fallthrough: true }));
  }

  app.get("/favicon.ico", (req, res, next) => {
    const file = path.join(appOut, "favicon.ico.body");
    if (!fs.existsSync(file)) {
      next();
      return;
    }
    res.type("image/x-icon");
    res.sendFile(file);
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "not found" });
      return;
    }

    const wantsRsc = req.get("rsc") === "1";
    const urlPath = normalizePath(req.path);
    const pageFile = resolvePageFile(appOut, urlPath, wantsRsc);

    if (pageFile && fs.existsSync(pageFile)) {
      res.status(200);
      res.type(wantsRsc ? "text/x-component" : "html");
      res.sendFile(pageFile);
      return;
    }

    const notFound = path.join(
      appOut,
      wantsRsc ? "_not-found.rsc" : "_not-found.html",
    );
    if (fs.existsSync(notFound)) {
      res.status(404);
      res.type(wantsRsc ? "text/x-component" : "html");
      res.sendFile(notFound);
      return;
    }

    res.status(404).type("text").send("Not found");
  });
}

module.exports = { attachStaticUi, resolveAppDir, DIST_DIR };
