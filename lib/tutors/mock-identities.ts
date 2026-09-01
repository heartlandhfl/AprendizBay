import { isProductionNodeEnv, type MockTutorEnv } from "@/lib/tutors/mock-gate";

/**
 * Known fictional marketplace identities from development fixtures.
 * Production public surfaces must never emit these names, ids, or hubs —
 * even if Firestore was accidentally seeded with MOCK_TUTORS.
 */
export const KNOWN_MOCK_TUTOR_NAMES = [
  "Mariana Silva",
  "Lucas Ferreira",
  "Rodrigo Almeida",
  "Fernanda Costa",
  "André Martins",
  "Andre Martins",
] as const;

export const KNOWN_MOCK_TUTOR_IDS = ["1", "2", "3", "4", "5"] as const;

export const KNOWN_MOCK_HUB_IDS = [
  "hub-m1",
  "hub-m2",
  "hub-l1",
  "hub-l2",
  "hub-r1",
  "hub-f1",
  "hub-f2",
  "hub-a1",
] as const;

const MOCK_TUTOR_NAMES = new Set<string>(KNOWN_MOCK_TUTOR_NAMES);
const MOCK_TUTOR_IDS = new Set<string>(KNOWN_MOCK_TUTOR_IDS);
const MOCK_HUB_IDS = new Set<string>(KNOWN_MOCK_HUB_IDS);

export function isKnownMockInventoryItem(item: unknown): boolean {
  if (typeof item === "string") {
    return MOCK_TUTOR_IDS.has(item) || MOCK_HUB_IDS.has(item) || MOCK_TUTOR_NAMES.has(item);
  }

  if (!item || typeof item !== "object") {
    return false;
  }

  const record = item as { id?: unknown; name?: unknown; tutorName?: unknown };
  if (typeof record.name === "string" && MOCK_TUTOR_NAMES.has(record.name)) {
    return true;
  }
  if (typeof record.tutorName === "string" && MOCK_TUTOR_NAMES.has(record.tutorName)) {
    return true;
  }
  if (typeof record.id === "string" && (MOCK_TUTOR_IDS.has(record.id) || MOCK_HUB_IDS.has(record.id))) {
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
