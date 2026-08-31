"use strict";

const ALLOWED_AUDIT_ACTIONS = new Set(["tutor_review"]);

function normalizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      value == null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

async function writeAdminAuditLog({ db, FieldValue }, entry) {
  const actorUid = typeof entry?.actorUid === "string" ? entry.actorUid.trim() : "";
  const action = typeof entry?.action === "string" ? entry.action.trim() : "";

  if (!actorUid || !ALLOWED_AUDIT_ACTIONS.has(action)) {
    return { written: false };
  }

  await db.collection("adminAuditLogs").add({
    actorUid,
    action,
    targetType: typeof entry.targetType === "string" ? entry.targetType : null,
    targetId: typeof entry.targetId === "string" ? entry.targetId : null,
    metadata: normalizeAuditMetadata(entry.metadata),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { written: true };
}

async function writeAdminAuditLogSafe(deps, entry) {
  try {
    return await writeAdminAuditLog(deps, entry);
  } catch {
    return { written: false };
  }
}

module.exports = {
  ALLOWED_AUDIT_ACTIONS,
  normalizeAuditMetadata,
  writeAdminAuditLog,
  writeAdminAuditLogSafe,
};
