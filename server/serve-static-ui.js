"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");

const DIST_DIR = "hostinger-next";
const NEXT_STATIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

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

function mensagensThreadRedirect(urlPath) {
  const match = urlPath.match(/^\/mensagens\/([^/]+)$/);
  if (!match) {
    return null;
  }

  return `/mensagens?conversa=${encodeURIComponent(match[1])}`;
}

function resolvePageFile(appOut, urlPath, rsc) {
  const ext = rsc ? ".rsc" : ".html";
  const relative =
    urlPath === "/" ? `index${ext}` : `${urlPath.replace(/^\//, "")}${ext}`;
  return safeJoin(appOut, relative);
}

/**
 * Stream a file from disk with validators. Never reads the file body into
 * memory — Express/send uses sendFile + conditional GET (ETag / Last-Modified).
 *
 * @param {import("express").Response} res
 * @param {string} filePath
 * @param {{ status?: number, contentType?: string }} [options]
 * @param {() => void} [onMissing]
 */
function streamFile(res, filePath, options, onMissing) {
  const { status = 200, contentType } = options || {};
  res.status(status);
  if (contentType) {
    res.type(contentType);
  }

  res.sendFile(
    filePath,
    { etag: true, lastModified: true, dotfiles: "deny" },
    (error) => {
      if (!error) {
        return;
      }
      if (error.code === "ENOENT" && onMissing) {
        onMissing();
        return;
      }
      if (!res.headersSent) {
        res.status(error.statusCode || 500).end();
      }
    },
  );
}

/**
 * Serve the committed Next.js prerender (HTML + /_next/static) without
 * loading the Next runtime. Hostinger LiteSpeed kills the process when
 * `require("next")` / `prepare()` runs in the web worker.
 *
 * Only streams hostinger-next/server/app HTML and RSC via sendFile.
 * Never executes hostinger-next server JS bundles (those may reference
 * firebase-admin for Next.js RSC / Server Actions at build time).
 *
 * Synchronous route registration only — safe to call before listen().
 * No compression middleware (LiteSpeed gzips at the edge).
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
        etag: true,
        lastModified: true,
        immutable: true,
        maxAge: "365d",
        setHeaders(res) {
          res.setHeader("Cache-Control", NEXT_STATIC_CACHE_CONTROL);
        },
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
    app.use(
      express.static(publicDir, {
        fallthrough: true,
        etag: true,
        lastModified: true,
      }),
    );
  }

  function streamMetadataBody(res, filename, contentType) {
    const file = path.join(appOut, `${filename}.body`);
    streamFile(res, file, { contentType }, () => {
      if (!res.headersSent) {
        res.status(404).type("text").send("Not found");
      }
    });
  }

  app.get("/favicon.ico", (req, res, next) => {
    const file = path.join(appOut, "favicon.ico.body");
    res.type("image/x-icon");
    res.sendFile(file, { etag: true, lastModified: true }, (error) => {
      if (error?.code === "ENOENT") {
        next();
        return;
      }
      if (error && !res.headersSent) {
        next(error);
      }
    });
  });

  app.get("/robots.txt", (_req, res) => {
    streamMetadataBody(res, "robots.txt", "text/plain; charset=utf-8");
  });

  app.get("/sitemap.xml", (_req, res) => {
    streamMetadataBody(res, "sitemap.xml", "application/xml; charset=utf-8");
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "not found" });
      return;
    }

    const wantsRsc = req.get("rsc") === "1";
    const urlPath = normalizePath(req.path);
    const mensagensRedirect = mensagensThreadRedirect(urlPath);
    if (mensagensRedirect) {
      res.redirect(302, mensagensRedirect);
      return;
    }
    const pageFile = resolvePageFile(appOut, urlPath, wantsRsc);
    const contentType = wantsRsc ? "text/x-component" : "html";

    if (!pageFile) {
      res.status(404).type("text").send("Not found");
      return;
    }

    streamFile(res, pageFile, { status: 200, contentType }, () => {
      const notFound = path.join(
        appOut,
        wantsRsc ? "_not-found.rsc" : "_not-found.html",
      );
      streamFile(res, notFound, { status: 404, contentType }, () => {
        if (!res.headersSent) {
          res.status(404).type("text").send("Not found");
        }
      });
    });
  });
}

module.exports = {
  attachStaticUi,
  resolveAppDir,
  DIST_DIR,
  mensagensThreadRedirect,
};
