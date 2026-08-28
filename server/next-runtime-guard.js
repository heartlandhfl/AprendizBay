"use strict";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Refuse to load the Next.js runtime in production. Hostinger serves
 * hostinger-next/ as static files; require("next") OOMs LiteSpeed workers.
 *
 * @param {string} context Caller label for logs
 */
function loadNext(context) {
  if (isProduction()) {
    const message = `Blocked require("next") in production (${context}). Serving static UI only.`;
    console.error(`[Aprendiz Bay] ${message}`);
    const error = new Error(message);
    error.code = "NEXT_RUNTIME_BLOCKED";
    throw error;
  }
  return require("next");
}

let guardInstalled = false;

/** Patch require() so any production require("next") is blocked and logged. */
function installNextRequireGuard() {
  if (!isProduction() || guardInstalled) {
    return;
  }

  const Module = require("module");
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function patchedRequire(request) {
    if (request === "next") {
      const caller = this.filename || "unknown";
      const message = `Blocked require("next") in production (${caller}). Serving static UI only.`;
      console.error(`[Aprendiz Bay] ${message}`);
      const error = new Error(message);
      error.code = "NEXT_RUNTIME_BLOCKED";
      throw error;
    }
    return originalRequire.apply(this, arguments);
  };

  guardInstalled = true;
}

module.exports = {
  isProduction,
  loadNext,
  installNextRequireGuard,
};
