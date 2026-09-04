import { describe, expect, it } from "vitest";
import {
  buildAdminEmailDeliveryMonitor,
  parseAdminEmailOutboxFilters,
} from "@/lib/admin/email-outbox";
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
  };

  return {
    collection: () => collection,
  };
}

describe("parseAdminEmailOutboxFilters", () => {
  it("parses supported query params", () => {
    const filters = parseAdminEmailOutboxFilters(
      new URLSearchParams(
        "dateFrom=2026-01-01&dateTo=2026-01-31&event=BOOKING_ACCEPTED&recipient=student&booking=booking-1&provider=jetsend&status=sent&deliveryStatus=delivered&limit=25",
      ),
    );

    expect(filters).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      eventName: "BOOKING_ACCEPTED",
      recipient: "student",
      bookingId: "booking-1",
      provider: "jetsend",
      status: "sent",
      deliveryStatus: "delivered",
      limit: 25,
    });
  });
});

describe("buildAdminEmailDeliveryMonitor", () => {
  it("masks recipient emails and omits message bodies", async () => {
    const db = createMockDb([
      {
        id: "email-1",
        data: {
          eventName: "BOOKING_ACCEPTED",
          recipientEmail: "student@example.com",
          subject: "Sua aula foi confirmada",
          status: "sent",
          deliveryStatus: "delivered",
          attempts: 1,
          provider: "jetsend",
          providerMessageId: "msg-123",
          createdAt: new Date("2026-01-02T10:00:00.000Z"),
          sentAt: new Date("2026-01-02T10:00:01.000Z"),
          text: "conteúdo sensível",
          html: "<p>conteúdo sensível</p>",
        },
      },
    ]);

    const monitor = await buildAdminEmailDeliveryMonitor(db as never);

    expect(monitor.emails[0]).toMatchObject({
      emailId: "email-1",
      recipientEmail: "s***@example.com",
      subject: "Sua aula foi confirmada",
      providerMessageId: "msg-123",
    });
    expect(monitor.emails[0]).not.toHaveProperty("text");
    expect(monitor.emails[0]).not.toHaveProperty("html");
  });

  it("raises complaint and backlog alerts", async () => {
    const recentRows: Array<{ id: string; data: Record<string, unknown> }> = Array.from({ length: 25 }, (_, index) => ({
      id: `pending-${index}`,
      data: {
        eventName: "NEW_MESSAGE",
        recipientEmail: `user${index}@example.com`,
        subject: "Nova mensagem",
        status: "pending",
        attempts: 0,
        createdAt: new Date(),
      },
    }));

    recentRows.push({
      id: "complaint-1",
      data: {
        eventName: "BOOKING_ACCEPTED",
        recipientEmail: "complaint@example.com",
        subject: "Confirmação",
        status: "sent",
        deliveryStatus: "complained",
        provider: "jetsend",
        attempts: 1,
        createdAt: new Date(),
      },
    });

    const db = createMockDb(recentRows);
    const monitor = await buildAdminEmailDeliveryMonitor(db as never);

    expect(monitor.alerts.some((alert) => alert.id === "complaint-events")).toBe(true);
    expect(monitor.alerts.some((alert) => alert.id === "growing-outbox-backlog")).toBe(true);
  });

  it("filters by booking and event", async () => {
    const db = createMockDb([
      {
        id: "email-a",
        data: {
          eventName: "BOOKING_ACCEPTED",
          bookingId: "booking-1",
          recipientEmail: "a@example.com",
          subject: "A",
          status: "sent",
          attempts: 1,
          createdAt: new Date("2026-01-02T10:00:00.000Z"),
        },
      },
      {
        id: "email-b",
        data: {
          eventName: "NEW_MESSAGE",
          bookingId: "booking-2",
          recipientEmail: "b@example.com",
          subject: "B",
          status: "sent",
          attempts: 1,
          createdAt: new Date("2026-01-02T11:00:00.000Z"),
        },
      },
    ]);

    const monitor = await buildAdminEmailDeliveryMonitor(db as never, {
      bookingId: "booking-1",
      eventName: "BOOKING_ACCEPTED",
    });

    expect(monitor.emails).toHaveLength(1);
    expect(monitor.emails[0]?.emailId).toBe("email-a");
  });
});

describe("admin email monitor metrics", () => {
  it("uses available metrics for summary cards", () => {
    expect(availableMetric(12)).toEqual({ available: true, value: 12 });
  });
});
