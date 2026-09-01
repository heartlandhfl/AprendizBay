import { isProductionNodeEnv, type MockTutorEnv } from "@/lib/tutors/mock-gate";

/**
 * FNV-1a fingerprints of development fixture identities.
 * The plaintext names/ids live only in `lib/mock-tutors.ts` and tests so
 * production bundles cannot ship fictional marketplace inventory.
 */
const BLOCKED_FINGERPRINTS = new Set([
  "122af905",
  "c1b70a03",
  "6162b514",
  "1d767518",
  "743da987",
  "df05a38b",
  "340ca71c",
  "370cabd5",
  "360caa42",
  "310ca263",
  "300ca0d0",
  "091187b1",
  "061182f8",
  "0d13cc94",
  "1013d14d",
  "78c941e6",
  "90fb047a",
  "8ffb02e7",
  "00f36605",
]);

export function fingerprintMockIdentity(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isBlockedIdentity(value: string): boolean {
  return BLOCKED_FINGERPRINTS.has(fingerprintMockIdentity(value));
}

export function isKnownMockInventoryItem(item: unknown): boolean {
  if (typeof item === "string") {
    return isBlockedIdentity(item);
  }

  if (!item || typeof item !== "object") {
    return false;
  }

  const record = item as { id?: unknown; name?: unknown; tutorName?: unknown };
  if (typeof record.name === "string" && isBlockedIdentity(record.name)) {
    return true;
  }
  if (typeof record.tutorName === "string" && isBlockedIdentity(record.tutorName)) {
    return true;
  }
  if (typeof record.id === "string" && isBlockedIdentity(record.id)) {
    return true;
  }

  return false;
}

/** Drops known mock inventory in production. Development/test catalogs are unchanged. */
export function rejectMockTutorInventory<T>(
  items: T[],
  env: MockTutorEnv = process.env,
): T[] {
  if (!isProductionNodeEnv(env)) {
    return items;
  }

  return items.filter((item) => !isKnownMockInventoryItem(item));
}
