"use strict";

const CANONICAL_ROLES = ["student", "lecturer", "admin", "facilitator", "support"];
const PRIVILEGED_ROLES = ["admin", "lecturer", "facilitator", "support"];
const SIGNUP_ROLES = ["student", "tutor"];

function isCanonicalRole(value) {
  return CANONICAL_ROLES.includes(value);
}

function isPrivilegedRole(value) {
  return PRIVILEGED_ROLES.includes(value);
}

function isSignupRole(value) {
  return SIGNUP_ROLES.includes(value);
}

function normalizeRole(role) {
  if (!role || typeof role !== "string") return null;
  if (role === "tutor") return "lecturer";
  return isCanonicalRole(role) ? role : null;
}

function profileRoleForCanonical(role) {
  return role;
}

function roleDisplayLabel(role) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "lecturer":
      return "Professor";
    case "student":
      return "Aluno";
    case "admin":
      return "Administrador";
    case "facilitator":
      return "Facilitador";
    case "support":
      return "Suporte";
    default:
      return "Usuário";
  }
}

function isLecturerRole(role) {
  return normalizeRole(role) === "lecturer";
}

function isStudentRole(role) {
  return normalizeRole(role) === "student";
}

function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

function isFacilitatorRole(role) {
  return normalizeRole(role) === "facilitator";
}

function isSupportRole(role) {
  return normalizeRole(role) === "support";
}

function roleMatchesAny(actual, allowed) {
  if (!allowed || allowed.length === 0) {
    return true;
  }

  const normalizedActual = normalizeRole(actual);
  if (!normalizedActual) {
    return false;
  }

  return allowed.some((role) => normalizeRole(role) === normalizedActual);
}

module.exports = {
  CANONICAL_ROLES,
  PRIVILEGED_ROLES,
  SIGNUP_ROLES,
  isCanonicalRole,
  isLecturerRole,
  isStudentRole,
  isAdminRole,
  isFacilitatorRole,
  isSupportRole,
  isPrivilegedRole,
  isSignupRole,
  normalizeRole,
  profileRoleForCanonical,
  roleDisplayLabel,
  roleMatchesAny,
};
