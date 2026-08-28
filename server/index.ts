import path from "path";
import express from "express";
import next from "next";
import type { IncomingMessage, ServerResponse } from "http";
import { apiRouter } from "./api";

/**
 * Hostinger starts `node server.js` and does not run `npm start`, so NODE_ENV
 * is often unset. Treat anything other than "development" as production.
 */
const dev = process.env.NODE_ENV === "development";
const appDir = path.resolve(__dirname, "..");

function getPort(): number | string {
  const raw = process.env.PORT;
  if (!raw) {
    return 3000;
  }
  return /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : raw;
}

type NextHandle = (req: IncomingMessage, res: ServerResponse) => void;

async function main(): Promise<void> {
  const port = getPort();
  const server = express();
  server.set("trust proxy", 1);
  server.use(express.json({ limit: "1mb" }));
  server.use("/api", apiRouter);

  let handle: NextHandle | undefined;
  let prepareError: Error | undefined;
  let markReady: () => void = () => undefined;
  const nextReady = new Promise<void>((resolve) => {
    markReady = resolve;
  });

  server.use((req, res) => {
    void (async () => {
      if (prepareError) {
        res.status(500).send("Failed to start the application.");
        return;
      }

      if (!handle) {
        await Promise.race([
          nextReady,
          new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Timed out waiting for Next.js")), 90_000);
          }),
        ]);
      }

      const nextHandle = handle;
      if (!nextHandle) {
        throw new Error("Next.js request handler is not ready.");
      }
      nextHandle(req, res);
    })().catch((error: unknown) => {
      console.error("[Aprendiz Bay] Request failed while Next.js was starting:", error);
      if (!res.headersSent) {
        res.status(503).send("The server is starting, try again in a moment.");
      }
    });
  });

  // Bind the way Hostinger's Express example does: listen(PORT) only.
  // Passing 0.0.0.0 can miss their reverse-proxy health check.
  server.listen(port, () => {
    console.log(`[Aprendiz Bay] Express listening on ${String(port)}`);
  });

  try {
    const nextApp = next({ dev, dir: appDir });
    await nextApp.prepare();
    handle = nextApp.getRequestHandler();
    console.log("[Aprendiz Bay] Next.js is ready");
  } catch (error) {
    prepareError = error instanceof Error ? error : new Error(String(error));
    console.error("[Aprendiz Bay] Next.js failed to start:", prepareError);
  } finally {
    markReady();
  }
}

main().catch((error: unknown) => {
  console.error("[Aprendiz Bay] Failed to start Express server:", error);
  process.exit(1);
});
