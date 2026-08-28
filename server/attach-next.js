"use strict";

const path = require("path");
const fs = require("fs");
const { apiRouter } = require("./api");

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

/**
 * @param {import("express").Express} app
 */
async function attachNext(app) {
  const dev = process.env.NODE_ENV === "development";
  const appDir = resolveAppDir();
  const buildId = path.join(appDir, DIST_DIR, "BUILD_ID");

  try {
    console.log(
      `[Aprendiz Bay] app dir=${appDir} contents=${fs.readdirSync(appDir).join(",")}`,
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Could not list app dir:", error);
  }

  app.use("/api", apiRouter);

  if (!dev && !fs.existsSync(buildId)) {
    throw new Error(
      `Missing ${buildId}. Hostinger copies git-tracked files only; run "npm run build" and commit "${DIST_DIR}/" (keep cache/ gitignored).`,
    );
  }

  const next = require("next");
  const nextApp = next({ dev, dir: appDir });
  await nextApp.prepare();
  return nextApp.getRequestHandler();
}

module.exports = { attachNext };
