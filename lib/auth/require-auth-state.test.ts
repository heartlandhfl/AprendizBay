import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  computeHasRoleMismatch,
  computeIsAuthorized,
  computeMissingProfileForRoleGate,
  computeNeedsEmailVerification,
  resolveAuthRedirectUrl,
} from "@/lib/auth/require-auth-state";
import type { AuthGateContext } from "@/lib/auth/require-auth-state";
import type { UserDoc } from "@/lib/auth/types";

function userDoc(role: UserDoc["role"]): UserDoc {
  return {
    role,
    displayName: "Test User",
    email: "test@example.com",
    createdAt: {} as UserDoc["createdAt"],
  };
}

function baseContext(overrides: Partial<AuthGateContext> = {}): AuthGateContext {
  return {
    options: {
      roles: ["lecturer"],
      redirectTo: "/login",
      unauthorizedRedirectTo: "/",
      skipSetupGate: false,
      skipEmailVerification: false,
    },
    user: { uid: "user-1", emailVerified: true, providerData: [{ providerId: "password" }] },
    userDoc: userDoc("lecturer"),
    loading: false,
    tokenRole: null,
    claimsLoading: false,
    pathname: "/tutor/dashboard",
    searchParams: new URLSearchParams(),
    setupLoading: false,
    learningProfile: { preferredSubject: "Inglês", preferredModality: "online" },
    tutorDoc: null,
    ...overrides,
  };
}

describe("computeHasRoleMismatch", () => {
  it("requires admin custom claims for admin routes", () => {
    const context = baseContext({
      options: {
        roles: ["admin"],
        redirectTo: "/login",
        unauthorizedRedirectTo: "/",
        skipSetupGate: false,
        skipEmailVerification: false,
      },
      userDoc: userDoc("admin"),
      tokenRole: null,
    });

    expect(computeHasRoleMismatch(context)).toBe(true);
  });

  it("uses profile roles for non-admin routes", () => {
    expect(computeHasRoleMismatch(baseContext({ userDoc: userDoc("student") }))).toBe(true);
    expect(computeHasRoleMismatch(baseContext())).toBe(false);
  });
});

describe("computeNeedsEmailVerification", () => {
  it("flags password users with unverified email", () => {
    const context = baseContext({
      user: {
        uid: "user-1",
        emailVerified: false,
        providerData: [{ providerId: "password" }],
      },
    });

    expect(computeNeedsEmailVerification(context)).toBe(true);
  });
});

describe("computeMissingProfileForRoleGate", () => {
  it("requires a profile for role-gated routes", () => {
    expect(computeMissingProfileForRoleGate(baseContext({ userDoc: null }))).toBe(true);
  });
});

describe("buildLoginRedirectUrl", () => {
  it("preserves the return path in the login redirect", () => {
    expect(buildLoginRedirectUrl("/tutor/dashboard", new URLSearchParams(), "/login")).toBe(
      "/login?redirect=%2Ftutor%2Fdashboard",
    );
  });
});

describe("resolveAuthRedirectUrl", () => {
  it("redirects unauthenticated visitors to login", () => {
    expect(resolveAuthRedirectUrl(baseContext({ user: null }))).toBe(
      "/login?redirect=%2Ftutor%2Fdashboard",
    );
  });

  it("redirects unauthorized roles to the configured destination", () => {
    expect(resolveAuthRedirectUrl(baseContext({ userDoc: userDoc("student") }))).toBe("/");
  });
});

describe("computeIsAuthorized", () => {
  it("authorizes admins only with the admin claim", () => {
    const adminContext = baseContext({
      options: {
        roles: ["admin"],
        redirectTo: "/login",
        unauthorizedRedirectTo: "/",
        skipSetupGate: false,
        skipEmailVerification: false,
      },
      userDoc: userDoc("admin"),
      tokenRole: "admin",
    });

    expect(computeIsAuthorized(adminContext)).toBe(true);
    expect(computeIsAuthorized({ ...adminContext, tokenRole: null })).toBe(false);
  });
});
