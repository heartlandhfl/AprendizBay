import { describe, expect, it } from "vitest";
import {
  isProtectedPath,
  matchesRoutePrefix,
  shouldDenyAdminAccess,
  shouldRedirectUnverifiedEmail,
} from "@/lib/auth/protected-routes";

describe("matchesRoutePrefix", () => {
  it("matches exact paths and nested segments", () => {
    expect(matchesRoutePrefix("/dashboard", "/dashboard")).toBe(true);
    expect(matchesRoutePrefix("/dashboard/settings", "/dashboard")).toBe(true);
    expect(matchesRoutePrefix("/dashboards", "/dashboard")).toBe(false);
  });
});

describe("isProtectedPath", () => {
  it("protects authenticated app routes", () => {
    for (const route of [
      "/admin",
      "/admin/tutors",
      "/dashboard",
      "/bookings",
      "/aulas",
      "/mensagens",
      "/configuracoes",
      "/facilitador",
      "/account/setup",
      "/tutor/dashboard",
      "/tutor/settings",
      "/tutor/onboarding",
      "/verify-email",
    ]) {
      expect(isProtectedPath(route), route).toBe(true);
    }
  });

  it("does not protect public marketing routes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/search")).toBe(false);
  });
});

describe("shouldDenyAdminAccess", () => {
  it("denies non-admin sessions on admin routes", () => {
    expect(shouldDenyAdminAccess("/admin", "student")).toBe(true);
    expect(shouldDenyAdminAccess("/admin/tutors", undefined)).toBe(true);
  });

  it("allows admin claim on admin routes", () => {
    expect(shouldDenyAdminAccess("/admin", "admin")).toBe(false);
  });
});

describe("shouldRedirectUnverifiedEmail", () => {
  it("redirects unverified users except on exempt paths", () => {
    expect(shouldRedirectUnverifiedEmail("/dashboard", false)).toBe(true);
    expect(shouldRedirectUnverifiedEmail("/verify-email", false)).toBe(false);
    expect(shouldRedirectUnverifiedEmail("/account/setup", false)).toBe(false);
    expect(shouldRedirectUnverifiedEmail("/api/bookings", false)).toBe(false);
  });

  it("does not redirect verified users", () => {
    expect(shouldRedirectUnverifiedEmail("/dashboard", true)).toBe(false);
    expect(shouldRedirectUnverifiedEmail("/dashboard", undefined)).toBe(false);
  });
});
