"use strict";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isNextRuntimeRequest(request) {
  return request === "next" || request.startsWith("next/");
}

function isFirebaseAdminRequest(request) {
  return request === "firebase-admin" || request.startsWith("firebase-admin/");
}

/**
 * firebase-admin is allowed only from server/api/ (review rating recompute).
 * Next.js server bundles under hostinger-next/ and lib/ server modules must not
 * load it in the Express process.
 */
function isAllowedFirebaseAdminCaller(filename) {
  if (!filename || typeof filename !== "string") {
    return false;
  }
  const normalized = filename.replace(/\\/g, "/");
  return (
    normalized.includes("/server/api/") ||
    normalized.includes("/node_modules/firebase-admin/")
  );
}

function isBlockedProductionModule(request, filename) {
  if (isNextRuntimeRequest(request)) {
    return true;
  }
  if (isFirebaseAdminRequest(request)) {
    return !isAllowedFirebaseAdminCaller(filename);
  }
  return false;
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
 * Patch require() so production cannot load Next.js.
 * firebase-admin is allowed only from server/api/ (Hostinger review recompute).
 * Next server modules under lib/ and hostinger-next/server/ are build-time only.
 */
function installNextRequireGuard() {
  if (!isProduction() || guardInstalled) {
    return;
  }

  const Module = require("module");
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function patchedRequire(request) {
    const caller = this.filename || "unknown";
    if (isBlockedProductionModule(request, caller)) {
      blockProductionModule(caller, request);
    }
    return originalRequire.apply(this, arguments);
  };

  guardInstalled = true;
}

module.exports = {
  isProduction,
  isBlockedProductionModule,
  isAllowedFirebaseAdminCaller,
  loadNext,
  installNextRequireGuard,
};
