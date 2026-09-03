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

module.exports = {
  CANONICAL_ROLES,
  PRIVILEGED_ROLES,
  SIGNUP_ROLES,
  isCanonicalRole,
  isLecturerRole,
  isPrivilegedRole,
  normalizeRole,
  profileRoleForCanonical,
  roleDisplayLabel,
};
