export function assertAdminUser(userData: { role?: string } | null | undefined): void;

export function createAdminAuthError(message: string, code: string): Error & { code: string };

export function statusFromAdminError(error: unknown): number;
