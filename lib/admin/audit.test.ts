import { describe, expect, it } from "vitest";
import { writeAdminAuditLog, writeAdminAuditLogSafe } from "@/lib/admin/audit";

function createAuditDb() {
  const added: Record<string, unknown>[] = [];
  return {
    added,
    db: {
      collection(name: string) {
        expect(name).toBe("adminAuditLogs");
        return {
          async add(payload: Record<string, unknown>) {
            added.push(payload);
          },
        };
      },
    },
    FieldValue: { serverTimestamp: () => "TIMESTAMP" },
  };
}

describe("writeAdminAuditLog", () => {
  it("records tutor review actions with sanitized metadata", async () => {
    const fake = createAuditDb();

    const result = await writeAdminAuditLog(fake, {
      actorUid: "admin-1",
      action: "tutor_review",
      targetType: "tutor",
      targetId: "tutor-1",
      metadata: {
        action: "approve",
        status: "approved",
        previousStatus: "pending",
        nested: { ignored: true },
      },
    });

    expect(result).toEqual({ written: true });
    expect(fake.added).toEqual([
      {
        actorUid: "admin-1",
        action: "tutor_review",
        targetType: "tutor",
        targetId: "tutor-1",
        metadata: {
          action: "approve",
          status: "approved",
          previousStatus: "pending",
        },
        createdAt: "TIMESTAMP",
      },
    ]);
  });

  it("ignores unknown actions instead of writing a partial audit row", async () => {
    const fake = createAuditDb();

    await expect(
      writeAdminAuditLog(fake, {
        actorUid: "admin-1",
        action: "delete_everything",
      }),
    ).resolves.toEqual({ written: false });
    expect(fake.added).toEqual([]);
  });

  it("does not fail the caller when the audit write throws", async () => {
    const result = await writeAdminAuditLogSafe(
      {
        db: {
          collection() {
            return {
              async add() {
                throw new Error("unavailable");
              },
            };
          },
        },
        FieldValue: { serverTimestamp: () => "TIMESTAMP" },
      },
      { actorUid: "admin-1", action: "tutor_review" },
    );

    expect(result).toEqual({ written: false });
  });
});
