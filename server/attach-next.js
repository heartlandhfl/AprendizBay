"use strict";

const path = require("path");
const fs = require("fs");
const next = require("next");
const { apiRouter } = require("./api");

function resolveAppDir() {
  const candidates = [path.resolve(__dirname, ".."), process.cwd()];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, ".next"))) {
      return dir;
    }
  }
  return candidates[0];
}

/**
 * Mount Express APIs and prepare the Next.js request handler.
 * @param {import("express").Express} app
 */
async function attachNext(app) {
  const dev = process.env.NODE_ENV === "development";
  const appDir = resolveAppDir();
  const nextDir = path.join(appDir, ".next");

  console.log(`[Aprendiz Bay] Next.js dir=${appDir} exists=${fs.existsSync(nextDir)}`);

  if (!fs.existsSync(nextDir)) {
    throw new Error(
      `Missing ${nextDir}. Hostinger must run the npm "build" script (next build) before start.`,
    );
  }

  app.use("/api", apiRouter);

  const nextApp = next({ dev, dir: appDir });
  await nextApp.prepare();
  return nextApp.getRequestHandler();
}

module.exports = { attachNext };
