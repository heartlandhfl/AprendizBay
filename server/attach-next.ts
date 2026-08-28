import path from "path";
import type { Express } from "express";
import next from "next";
import { apiRouter } from "./api";

export async function attachNext(app: Express) {
  const dev = process.env.NODE_ENV === "development";
  const appDir = path.resolve(__dirname, "..");

  app.use("/api", apiRouter);

  const nextApp = next({ dev, dir: appDir });
  await nextApp.prepare();
  return nextApp.getRequestHandler();
}
