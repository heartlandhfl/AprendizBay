"use strict";

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const next = require("next");
const { apiRouter } = require("./api");

const DIST_DIR = "hostinger-next";

function resolveAppDir() {
  const candidates = [path.resolve(__dirname, ".."), process.cwd()];
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, DIST_DIR)) ||
      fs.existsSync(path.join(dir, ".next")) ||
      fs.existsSync(path.join(dir, "package.json"))
    ) {
      return dir;
    }
  }
  return candidates[0];
}

function hasNextOutput(appDir) {
  return (
    fs.existsSync(path.join(appDir, DIST_DIR, "BUILD_ID")) ||
    fs.existsSync(path.join(appDir, ".next", "BUILD_ID"))
  );
}

function runNextBuild(appDir) {
  const nextBin = require.resolve("next/dist/bin/next", { paths: [appDir] });
  console.log(`[Aprendiz Bay] Running next build in ${appDir} (output missing from Hostinger runtime copy)`);

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`next build exited with code ${result.status ?? "unknown"}`);
  }
}

/**
 * Mount Express APIs and prepare the Next.js request handler.
 * Hostinger's hbuilds copy omits gitignored folders such as `.next`, so we
 * build at process start when the output is not already on disk.
 * @param {import("express").Express} app
 */
async function attachNext(app) {
  const dev = process.env.NODE_ENV === "development";
  const appDir = resolveAppDir();

  try {
    console.log(
      `[Aprendiz Bay] app dir=${appDir} contents=${fs.readdirSync(appDir).join(",")}`,
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Could not list app dir:", error);
  }

  if (!dev && !hasNextOutput(appDir)) {
    runNextBuild(appDir);
  }

  if (!dev && !hasNextOutput(appDir)) {
    throw new Error(`next build did not produce ${path.join(appDir, DIST_DIR)}`);
  }

  app.use("/api", apiRouter);

  const nextApp = next({ dev, dir: appDir });
  await nextApp.prepare();
  return nextApp.getRequestHandler();
}

module.exports = { attachNext };
