import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldDenyAdminAccess } from "@/lib/auth/protected-routes";
import { resolveMiddlewareDecision } from "@/lib/auth/resolve-middleware-action";

function middlewareSource(): string {
  return readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");
}

function extractMatcherPaths(source: string): string[] {
  const block = source.match(/matcher:\s*\[([\s\S]*?)\]/);
  if (!block) {
    throw new Error("middleware matcher block not found");
  }
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe("middleware matcher coverage", () => {
  it("includes exact protected index routes (not only /:path* children)", () => {
    const paths = extractMatcherPaths(middlewareSource());
    for (const route of [
      "/dashboard",
      "/bookings",
      "/aulas",
      "/mensagens",
      "/configuracoes",
      "/facilitator",
      "/admin",
      "/tutor/dashboard",
      "/tutor/settings",
      "/tutor/onboarding",
      "/account/setup",
      "/verify-email",
    ]) {
      const normalized = route === "/facilitator" ? "/facilitador" : route;
      expect(paths, `missing matcher for ${normalized}`).toContain(normalized);
    }
  });
});

describe("middleware admin authorization", () => {
  it("requires the admin custom claim in session decisions", () => {
    expect(shouldDenyAdminAccess("/admin", "student")).toBe(true);
    expect(
      resolveMiddlewareDecision({
        pathname: "/admin",
        hasSessionCookie: true,
        session: { role: "admin", emailVerified: true },
      }).action,
    ).toBe("allow");
    expect(middlewareSource()).not.toMatch(/userDoc.*admin|profile.*admin/i);
  });
});
