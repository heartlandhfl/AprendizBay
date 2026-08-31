"use strict";

const VERIFICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "suspended",
];

const ADMIN_REVIEW_ACTIONS = ["approve", "reject", "request_changes", "suspend"];

const STATUS_LABELS = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  changes_requested: "Ajustes solicitados",
  suspended: "Suspenso",
};

const ACTION_LABELS = {
  approve: "Aprovar",
  reject: "Recusar",
  request_changes: "Solicitar ajustes",
  suspend: "Suspender",
};

const ADMIN_TRANSITIONS = {
  approve: ["pending", "changes_requested", "rejected", "suspended"],
  reject: ["pending", "changes_requested", "approved", "suspended"],
  request_changes: ["pending", "rejected", "approved"],
  suspend: ["approved"],
};

const TUTOR_RESUBMIT_FROM = ["changes_requested", "rejected"];

function isVerificationStatus(value) {
  return typeof value === "string" && VERIFICATION_STATUSES.includes(value);
}

function isAdminReviewAction(value) {
  return typeof value === "string" && ADMIN_REVIEW_ACTIONS.includes(value);
}

function resolveVerificationStatus(data) {
  if (isVerificationStatus(data?.verificationStatus)) {
    return data.verificationStatus;
  }

  return data?.isVerified === true ? "approved" : "pending";
}

function isMarketplaceVisible(data) {
  return resolveVerificationStatus(data) === "approved";
}

function nextStatusForAction(action) {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "request_changes":
      return "changes_requested";
    case "suspend":
      return "suspended";
    default: {
      const error = new Error("Ação de verificação inválida.");
      error.code = "INVALID_ACTION";
      throw error;
    }
  }
}

function canAdminTransition(fromStatus, action) {
  return (ADMIN_TRANSITIONS[action] || []).includes(fromStatus);
}

function canTutorResubmit(fromStatus) {
  return TUTOR_RESUBMIT_FROM.includes(fromStatus);
}

function actionRequiresReason(action) {
  return action === "reject" || action === "request_changes" || action === "suspend";
}

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validateAdminReview({ currentStatus, action, reason }) {
  if (!isAdminReviewAction(action)) {
    throw createCodedError("Ação de verificação inválida.", "INVALID_ACTION");
  }

  const fromStatus = isVerificationStatus(currentStatus) ? currentStatus : "pending";

  if (!canAdminTransition(fromStatus, action)) {
    throw createCodedError(
      `Não é possível ${ACTION_LABELS[action].toLowerCase()} um professor com status "${STATUS_LABELS[fromStatus]}".`,
      "INVALID_TRANSITION",
    );
  }

  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (actionRequiresReason(action) && trimmed.length < 8) {
    throw createCodedError("Informe um motivo com pelo menos 8 caracteres.", "REASON_REQUIRED");
  }

  return {
    nextStatus: nextStatusForAction(action),
    reason: trimmed || null,
  };
}

function validateTutorResubmit(currentStatus) {
  const fromStatus = isVerificationStatus(currentStatus) ? currentStatus : "pending";

  if (!canTutorResubmit(fromStatus)) {
    throw createCodedError(
      "Só é possível reenviar a verificação quando há ajustes solicitados ou recusa.",
      "INVALID_TRANSITION",
    );
  }

  return { nextStatus: "pending" };
}

function buildVerificationWrite({
  status,
  reviewedBy,
  reason,
  deleteSentinel,
  timestamp,
  clearReviewMeta = false,
}) {
  const write = {
    verificationStatus: status,
    isVerified: status === "approved",
    updatedAt: timestamp,
  };

  if (reviewedBy) {
    write.reviewedBy = reviewedBy;
    write.reviewedAt = timestamp;
  }

  if (reason) {
    write.verificationReason = reason;
  } else if (status === "approved" || clearReviewMeta) {
    write.verificationReason = deleteSentinel;
  }

  return write;
}

function tutorStatusMessage(status, reason) {
  switch (status) {
    case "pending":
      return {
        title: "Verificação em análise",
        body: "Recebemos seu perfil. Você não aparecerá na busca como professor verificado até a aprovação da equipe.",
        tone: "info",
      };
    case "approved":
      return {
        title: "Perfil verificado",
        body: "Seu perfil foi aprovado e já pode aparecer na busca da Aprendiz Bay.",
        tone: "success",
      };
    case "rejected":
      return {
        title: "Verificação recusada",
        body: reason
          ? `Sua verificação foi recusada. Motivo: ${reason}`
          : "Sua verificação foi recusada. Atualize seus dados e reenvie o documento.",
        tone: "error",
      };
    case "changes_requested":
      return {
        title: "Ajustes solicitados",
        body: reason
          ? `Precisamos de ajustes antes de aprovar seu perfil. Motivo: ${reason}`
          : "Precisamos de ajustes no seu perfil ou documento. Atualize e reenvie para nova análise.",
        tone: "warning",
      };
    case "suspended":
      return {
        title: "Perfil suspenso",
        body: reason
          ? `Seu perfil foi suspenso e não aparece mais na busca. Motivo: ${reason}`
          : "Seu perfil foi suspenso e não aparece mais na busca.",
        tone: "error",
      };
    default:
      return {
        title: "Verificação",
        body: "Acompanhe o status da verificação do seu perfil.",
        tone: "info",
      };
  }
}

async function applyAdminVerificationReview(
  { db, FieldValue },
  { tutorId, adminUid, action, reason },
) {
  const trimmedTutorId = String(tutorId || "").trim();
  if (!trimmedTutorId) {
    throw createCodedError("Informe o identificador do professor.", "INVALID_TUTOR");
  }

  if (adminUid && adminUid === trimmedTutorId) {
    throw createCodedError(
      "Um professor não pode revisar a própria verificação.",
      "SELF_REVIEW",
    );
  }

  const tutorRef = db.collection("tutors").doc(trimmedTutorId);
  const snapshot = await tutorRef.get();

  if (!snapshot.exists) {
    throw createCodedError("Professor não encontrado.", "NOT_FOUND");
  }

  const currentStatus = resolveVerificationStatus(snapshot.data());
  const decision = validateAdminReview({
    currentStatus,
    action,
    reason,
  });

  await tutorRef.update(
    buildVerificationWrite({
      status: decision.nextStatus,
      reviewedBy: adminUid,
      reason: decision.reason,
      deleteSentinel: FieldValue.delete(),
      timestamp: FieldValue.serverTimestamp(),
    }),
  );

  return {
    tutorId: trimmedTutorId,
    status: decision.nextStatus,
    previousStatus: currentStatus,
  };
}

async function applyTutorVerificationResubmit({ db, FieldValue }, { tutorId }) {
  const trimmedTutorId = String(tutorId || "").trim();
  if (!trimmedTutorId) {
    throw createCodedError("Informe o identificador do professor.", "INVALID_TUTOR");
  }

  const tutorRef = db.collection("tutors").doc(trimmedTutorId);
  const snapshot = await tutorRef.get();

  if (!snapshot.exists) {
    throw createCodedError("Professor não encontrado.", "NOT_FOUND");
  }

  const currentStatus = resolveVerificationStatus(snapshot.data());
  validateTutorResubmit(currentStatus);

  await tutorRef.update(
    buildVerificationWrite({
      status: "pending",
      deleteSentinel: FieldValue.delete(),
      timestamp: FieldValue.serverTimestamp(),
    }),
  );

  return {
    tutorId: trimmedTutorId,
    status: "pending",
    previousStatus: currentStatus,
  };
}

module.exports = {
  ACTION_LABELS,
  ADMIN_REVIEW_ACTIONS,
  ADMIN_TRANSITIONS,
  STATUS_LABELS,
  TUTOR_RESUBMIT_FROM,
  VERIFICATION_STATUSES,
  actionRequiresReason,
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
  buildVerificationWrite,
  canAdminTransition,
  canTutorResubmit,
  isAdminReviewAction,
  isMarketplaceVisible,
  isVerificationStatus,
  nextStatusForAction,
  resolveVerificationStatus,
  tutorStatusMessage,
  validateAdminReview,
  validateTutorResubmit,
};
