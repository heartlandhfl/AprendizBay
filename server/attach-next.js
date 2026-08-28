"use strict";

const path = require("path");
const fs = require("fs");
const next = require("next");
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

function assertWritable(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, `.write-test-${process.pid}`);
  fs.writeFileSync(probe, "ok");
  fs.unlinkSync(probe);
}

function hasBuildId(appDir) {
  return fs.existsSync(path.join(appDir, DIST_DIR, "BUILD_ID"));
}

async function runNextBuild(appDir) {
  const nextBuild = require("next/dist/build").default;
  console.log(`[Aprendiz Bay] Building Next.js (in-process) in ${appDir}`);
  await nextBuild(
    appDir,
    false,
    false,
    false,
    false,
    false,
    false,
    "default",
  );
}

/**
 * @param {import("express").Express} app
 */
async function attachNext(app) {
  const dev = process.env.NODE_ENV === "development";
  const appDir = resolveAppDir();
  const distDir = path.join(appDir, DIST_DIR);

  try {
    console.log(
      `[Aprendiz Bay] app dir=${appDir} contents=${fs.readdirSync(appDir).join(",")}`,
    );
  } catch (error) {
    console.error("[Aprendiz Bay] Could not list app dir:", error);
  }

  try {
    assertWritable(distDir);
  } catch (error) {
    throw new Error(
      `Cannot write Next.js output to ${distDir}: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (!dev && !hasBuildId(appDir)) {
    await runNextBuild(appDir);
  }

  if (!dev && !hasBuildId(appDir)) {
    throw new Error(`next build did not produce ${path.join(distDir, "BUILD_ID")}`);
  }

  app.use("/api", apiRouter);

  const nextApp = next({ dev, dir: appDir });
  await nextApp.prepare();
  return nextApp.getRequestHandler();
}

module.exports = { attachNext };
