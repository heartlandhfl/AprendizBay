"use strict";

/**
 * Hostinger Express entry file (must be .js at the project root).
 * `npm run build` compiles `server/` into `dist-server/` first.
 */
try {
  require("./dist-server/index.js");
} catch (error) {
  const code = error && error.code;
  if (code === "MODULE_NOT_FOUND") {
    console.error(
      "[Aprendiz Bay] Missing dist-server/. Run `npm run build` before `npm start`.",
    );
  }
  throw error;
}
