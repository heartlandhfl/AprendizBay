export const FALLBACK_DISPLAY_NAME: string;
export const PUBLIC_PROFILE_COLLECTION: string;
export const PUBLIC_PROFILE_DOC_ID: string;

export function publicProfileFromUserData(data: unknown): {
  displayName: string;
  photoUrl: string | null;
} | null;

export function publicProfileRef(db: unknown, uid: string): unknown;

export function readOrBackfillPublicProfile(
  db: unknown,
  uid: string,
  FieldValue?: { serverTimestamp: () => unknown },
): Promise<{ displayName: string; photoUrl: string | null } | null>;
