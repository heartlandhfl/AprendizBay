"use strict";

const BLOCKED_PREFIXES = ["firebase-admin"];

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isBlockedProductionModule(request) {
  if (request === "next") {
    return true;
  }
  return BLOCKED_PREFIXES.some(
    (prefix) => request === prefix || request.startsWith(`${prefix}/`),
  );
}

function blockProductionModule(context, request) {
  const message = `Blocked require("${request}") in production (${context}). Serving static UI only.`;
  console.error(`[Aprendiz Bay] ${message}`);
  const error = new Error(message);
  error.code = "PRODUCTION_RUNTIME_BLOCKED";
  throw error;
}

/**
 * Refuse to load the Next.js runtime in production. Hostinger serves
 * hostinger-next/ as static files; require("next") OOMs LiteSpeed workers.
 *
 * @param {string} context Caller label for logs
 */
function loadNext(context) {
  if (isProduction()) {
    blockProductionModule(context, "next");
  }
  return require("next");
}

let guardInstalled = false;

/**
 * Patch require() so production cannot load Next.js or firebase-admin.
 * Next server modules under lib/ and hostinger-next/server/ are build-time only.
 */
function installNextRequireGuard() {
  if (!isProduction() || guardInstalled) {
    return;
  }

  const Module = require("module");
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function patchedRequire(request) {
    if (isBlockedProductionModule(request)) {
      const caller = this.filename || "unknown";
      blockProductionModule(caller, request);
    }
    return originalRequire.apply(this, arguments);
  };

  guardInstalled = true;
}

module.exports = {
  isProduction,
  isBlockedProductionModule,
  loadNext,
  installNextRequireGuard,
};
