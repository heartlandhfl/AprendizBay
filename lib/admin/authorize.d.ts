export function assertAdminUser(userData: { role?: string } | null | undefined): void;
export function assertAdminFromClaims(
  customClaims: { role?: unknown } | null | undefined,
): void;
export function statusFromAdminError(error: unknown): number;
export function createAdminAuthError(message: string, code: string): Error;
