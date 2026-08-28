import express from "express";
import next from "next";
import { apiRouter } from "./api";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

async function main(): Promise<void> {
  const nextApp = next({ dev, hostname, port });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  const server = express();
  server.set("trust proxy", 1);
  server.use(express.json({ limit: "1mb" }));
  server.use("/api", apiRouter);
  server.all("*", (req, res) => {
    void handle(req, res);
  });

  server.listen(port, hostname, () => {
    console.log(`[Aprendiz Bay] Express + Next.js ready on http://${hostname}:${port}`);
  });
}

main().catch((error: unknown) => {
  console.error("[Aprendiz Bay] Failed to start Express server:", error);
  process.exit(1);
});
