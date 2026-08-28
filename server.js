"use strict";

/**
 * Hostinger Express entry: `node server.js` (not `npm start`).
 * Force production unless this process was started for local `npm run dev`.
 */
if (process.env.NODE_ENV !== "development") {
  process.env.NODE_ENV = "production";
}

try {
  require("./dist-server/index.js");
} catch (error) {
  const code = error && error.code;
  if (code === "MODULE_NOT_FOUND") {
    console.error(
      "[Aprendiz Bay] Missing dist-server/. Run `npm run build` before starting.",
    );
  }
  throw error;
}
