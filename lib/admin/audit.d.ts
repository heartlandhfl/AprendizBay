export const ALLOWED_AUDIT_ACTIONS: Set<string>;

export interface AdminAuditEntry {
  actorUid: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export function normalizeAuditMetadata(metadata: unknown): Record<string, string | number | boolean | null>;

export function writeAdminAuditLog(
  deps: {
    db: {
      collection: (name: string) => {
        add: (data: Record<string, unknown>) => Promise<unknown>;
      };
    };
    FieldValue: { serverTimestamp: () => unknown };
  },
  entry: AdminAuditEntry,
): Promise<{ written: boolean }>;

export function writeAdminAuditLogSafe(
  deps: {
    db: {
      collection: (name: string) => {
        add: (data: Record<string, unknown>) => Promise<unknown>;
      };
    };
    FieldValue: { serverTimestamp: () => unknown };
  },
  entry: AdminAuditEntry,
): Promise<{ written: boolean }>;
