import { describe, expect, it } from "vitest";
import { resolveMiddlewareDecision } from "@/lib/auth/resolve-middleware-action";

describe("resolveMiddlewareDecision", () => {
  it("allows public routes without a session", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/login",
        hasSessionCookie: false,
        session: null,
      }),
    ).toEqual({ action: "allow" });
  });

  it("requires login on protected routes without a cookie", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/dashboard",
        hasSessionCookie: false,
        session: null,
      }),
    ).toEqual({ action: "login", clearSession: false });
  });

  it("clears invalid session cookies", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/dashboard",
        hasSessionCookie: true,
        session: null,
      }),
    ).toEqual({ action: "login", clearSession: true });
  });

  it("redirects non-admin users away from admin routes", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/admin",
        hasSessionCookie: true,
        session: { role: "student", emailVerified: true },
      }),
    ).toEqual({ action: "redirect", pathname: "/" });
  });

  it("allows admins on admin routes", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/admin/tutors",
        hasSessionCookie: true,
        session: { role: "admin", emailVerified: true },
      }),
    ).toEqual({ action: "allow" });
  });

  it("redirects unverified password users to verify-email", () => {
    expect(
      resolveMiddlewareDecision({
        pathname: "/dashboard",
        hasSessionCookie: true,
        session: { role: "student", emailVerified: false },
      }),
    ).toEqual({ action: "redirect", pathname: "/verify-email" });
  });
});
