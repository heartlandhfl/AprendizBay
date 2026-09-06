import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/public-config/route";

describe("GET /api/public-config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("never exposes email provider secrets to the browser", async () => {
    process.env.JETSEND_API_KEY = "jetsend-secret-must-stay-server-only";
    process.env.RESEND_API_KEY = "resend-secret-must-stay-server-only";
    process.env.SENDGRID_API_KEY = "sendgrid-secret-must-stay-server-only";
    process.env.EMAIL_PROVIDER = "jetsend";
    process.env.NEXT_PUBLIC_JETSEND_API_KEY = "should-not-exist-in-repo";

    const response = await GET();
    const payload = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(payload);

    expect(serialized.includes("jetsend-secret-must-stay-server-only")).toBe(false);
    expect(serialized.includes("resend-secret-must-stay-server-only")).toBe(false);
    expect(serialized.includes("sendgrid-secret-must-stay-server-only")).toBe(false);
    expect(serialized.includes("should-not-exist-in-repo")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "jetsendApiKey")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "emailProvider")).toBe(false);
  });

  it("never exposes JITSI_ROOM_SECRET to the browser", async () => {
    process.env.JITSI_ROOM_SECRET = "jitsi-room-secret-must-stay-server-only";

    const response = await GET();
    const payload = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(payload);

    expect(serialized.includes("jitsi-room-secret-must-stay-server-only")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "jitsiRoomSecret")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "JITSI_ROOM_SECRET")).toBe(false);
  });
});
