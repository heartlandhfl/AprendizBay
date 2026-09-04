import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLIENT_BOOKING_PATHS = [
  "lib/bookings/service.ts",
  "components/tutor/BookingWidget.tsx",
  "components/hubs/CollectiveClassDetail.tsx",
  "components/bookings/StudentBookingsList.tsx",
];

describe("client booking writes", () => {
  it("does not create booking documents from the browser", () => {
    for (const relativePath of CLIENT_BOOKING_PATHS) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).not.toMatch(/addDoc\s*\(/);
      expect(source, relativePath).not.toMatch(/setDoc\s*\(/);
      expect(source, relativePath).not.toMatch(/writeBatch|runTransaction/);
    }
  });

  it("sends individual reservations only to the authorized server path", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/bookings/service.ts"), "utf8");
    const createFn = source.slice(
      source.indexOf("export async function createBooking"),
      source.indexOf("export { CREATE_BOOKING_ERRORS }"),
    );

    expect(createFn).toMatch(/fetch\(\s*["']\/api\/bookings["']/);
    expect(createFn).toMatch(/Authorization/);
    expect(createFn).toContain("tutorId: input.tutorId");
    expect(createFn).toContain("scheduledAt: input.scheduledAt.toISOString()");
    expect(createFn).not.toMatch(/\bprice\b/);
    expect(createFn).not.toMatch(/platformFee/);
    expect(createFn).not.toMatch(/tutorAmount/);
    expect(createFn).not.toMatch(/paymentStatus/);
  });

  it("sends tutor acceptance only to the authorized server path", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/bookings/service.ts"), "utf8");
    const acceptFn = source.slice(
      source.indexOf("export async function confirmBookingAsTutor"),
      source.indexOf("export async function cancelBookingAsTutor"),
    );

    expect(acceptFn).toMatch(/fetch\(\s*["']\/api\/bookings\/accept["']/);
    expect(acceptFn).toMatch(/Authorization/);
    expect(acceptFn).not.toMatch(/updateDoc/);
    expect(acceptFn).not.toMatch(/paymentStatus:\s*["']awaiting_payment["']/);
  });

  it("sends collective joins only to the authorized server path", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/hubs/service.ts"), "utf8");

    expect(source).toMatch(/fetch\(\s*["']\/api\/hubs\/join["']/);
    expect(source).toMatch(/joinCollectiveClassAndBook/);
    expect(source).not.toMatch(/collection\(\s*db\s*,\s*["']bookings["']/);
    expect(source).not.toMatch(/runTransaction/);
    expect(source).not.toMatch(/confirmedStudentIds/);
  });

  it("sends reviews only to the authorized server path", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/reviews/client.ts"), "utf8");

    expect(source).toMatch(/fetch\(\s*["']\/api\/reviews["']/);
    expect(source).toMatch(/Authorization/);
    expect(source).not.toMatch(/setDoc\s*\(/);
    expect(source).not.toMatch(/addDoc\s*\(/);
  });
});
