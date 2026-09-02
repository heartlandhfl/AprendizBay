import { digitsOnly } from "@/lib/payments/cpf";

export type IdentityKind = "email" | "phone" | "cpf";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return digitsOnly(value);
}

export function normalizeCpf(value: string): string {
  return digitsOnly(value);
}

export function buildIdentityKey(kind: IdentityKind, value: string): string | null {
  if (kind === "email") {
    const normalized = normalizeEmail(value);
    return normalized.includes("@") ? `email:${normalized}` : null;
  }
  if (kind === "phone") {
    const normalized = normalizePhone(value);
    return normalized.length >= 10 ? `phone:${normalized}` : null;
  }
  const normalized = normalizeCpf(value);
  return normalized.length === 11 ? `cpf:${normalized}` : null;
}

export function collectIdentityKeys(input: {
  email?: string;
  phone?: string;
  cpf?: string;
}): string[] {
  const keys: string[] = [];
  if (input.email) {
    const key = buildIdentityKey("email", input.email);
    if (key) {
      keys.push(key);
    }
  }
  if (input.phone) {
    const key = buildIdentityKey("phone", input.phone);
    if (key) {
      keys.push(key);
    }
  }
  if (input.cpf) {
    const key = buildIdentityKey("cpf", input.cpf);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}
