import { describe, expect, it, vi } from "vitest";

import {
  buildAdminContactInboxList,
  getAdminContactInboxMessage,
  parseAdminContactInboxFilters,
  updateAdminContactInboxMessage,
} from "@/lib/admin/contact-inbox";
import { availableMetric } from "@/lib/admin/metrics";

function createMockDb(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  const collection = {
    where(field: string, _op: string, value: string) {
      const filtered = rows.filter((row) => row.data[field] === value);
      return {
        count: () => ({
          get: async () => ({
            data: () => ({ count: filtered.length }),
          }),
        }),
        orderBy: () => ({
          limit: () => ({
            get: async () => ({
              docs: rows.map((row) => ({
                id: row.id,
                data: () => row.data,
              })),
            }),
          }),
        }),
      };
    },
    orderBy() {
      return {
        limit: () => ({
          get: async () => ({
            docs: rows.map((row) => ({
              id: row.id,
              data: () => row.data,
            })),
          }),
        }),
      };
    },
    doc(id: string) {
      const row = rows.find((entry) => entry.id === id);
      return {
        get: async () => ({
          exists: Boolean(row),
          id,
          data: () => row?.data ?? {},
        }),
        update: async (update: Record<string, unknown>) => {
          if (!row) {
            throw new Error("not found");
          }
          row.data = { ...row.data, ...update };
        },
      };
    },
  };

  return {
    collection: () => collection,
  };
}

describe("parseAdminContactInboxFilters", () => {
  it("parses supported query params", () => {
    const filters = parseAdminContactInboxFilters(
      new URLSearchParams(
        "dateFrom=2026-01-01&dateTo=2026-01-31&status=unread&emailDelivery=failed&search=ana&limit=25",
      ),
    );

    expect(filters).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      status: "unread",
      emailDelivery: "failed",
      search: "ana",
      limit: 25,
    });
  });
});

describe("buildAdminContactInboxList", () => {
  it("returns contact inbox messages with workflow fields", async () => {
    const db = createMockDb([
      {
        id: "msg-1",
        data: {
          name: "Ana Silva",
          email: "ana@example.com",
          message: "Preciso de ajuda com pagamentos.",
          emailDelivery: "failed",
          emailSkipReason: "send_failed",
          status: "unread",
          createdAt: { toDate: () => new Date("2026-09-03T12:00:00.000Z") },
          readAt: null,
          respondedAt: null,
        },
      },
    ]);

    const inbox = await buildAdminContactInboxList(db as never);

    expect(inbox.summary.unread).toEqual(availableMetric(1));
    expect(inbox.summary.deliveryFailed).toEqual(availableMetric(1));
    expect(inbox.messages).toEqual([
      expect.objectContaining({
        messageId: "msg-1",
        name: "Ana Silva",
        email: "ana@example.com",
        emailDelivery: "failed",
        emailSkipReason: "send_failed",
        status: "unread",
        messagePreview: "Preciso de ajuda com pagamentos.",
      }),
    ]);
  });
});

describe("getAdminContactInboxMessage", () => {
  it("returns the full message body", async () => {
    const db = createMockDb([
      {
        id: "msg-1",
        data: {
          name: "Ana Silva",
          email: "ana@example.com",
          message: "Mensagem completa.",
          emailDelivery: "skipped",
          status: "unread",
        },
      },
    ]);

    const message = await getAdminContactInboxMessage(db as never, "msg-1");

    expect(message).toMatchObject({
      messageId: "msg-1",
      message: "Mensagem completa.",
      emailDelivery: "skipped",
    });
  });
});

describe("updateAdminContactInboxMessage", () => {
  it("updates status and stamps readAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T13:00:00.000Z"));

    const rows = [
      {
        id: "msg-1",
        data: {
          name: "Ana Silva",
          email: "ana@example.com",
          message: "Mensagem completa.",
          emailDelivery: "failed",
          status: "unread",
          readAt: null,
          respondedAt: null,
        },
      },
    ];

    const db = createMockDb(rows);
    const { FieldValue } = await import("firebase-admin/firestore");

    const updated = await updateAdminContactInboxMessage(db as never, "msg-1", {
      status: "read",
    });

    expect(rows[0]?.data.status).toBe("read");
    expect(rows[0]?.data.readAt).toBe(FieldValue.serverTimestamp());
    expect(updated?.status).toBe("read");

    vi.useRealTimers();
  });
});
