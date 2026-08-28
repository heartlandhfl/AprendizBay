import express from "express";
import type { RequestHandler } from "express";
import { attachNext } from "./attach-next";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

let nextHandle: RequestHandler | undefined;
let nextError: Error | undefined;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "aprendiz-bay",
    mode: "express",
    next: nextError ? "error" : nextHandle ? "ready" : "starting",
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  if (nextHandle) {
    nextHandle(req, res, next);
    return;
  }
  if (nextError) {
    res.status(500).send(nextError.message);
    return;
  }
  res.status(200).type("html").send("Starting…");
});

app.listen(port, () => {
  console.log(`[Aprendiz Bay] Express listening on ${port}`);
});

void attachNext(app)
  .then((handle) => {
    nextHandle = handle as RequestHandler;
    console.log("[Aprendiz Bay] Next.js is ready");
  })
  .catch((error: unknown) => {
    nextError = error instanceof Error ? error : new Error(String(error));
    console.error("[Aprendiz Bay] Next.js failed to start:", nextError);
  });
