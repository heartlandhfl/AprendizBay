import { describe, expect, it } from "vitest";
import { postAuthPathForRole, signupPathForRole } from "@/lib/auth/redirects";

describe("auth redirects", () => {
  it("routes professors to onboarding", () => {
    expect(postAuthPathForRole("tutor")).toBe("/tutor/onboarding");
    expect(postAuthPathForRole("lecturer")).toBe("/tutor/onboarding");
  });

  it("routes students to bookings", () => {
    expect(postAuthPathForRole("student")).toBe("/bookings");
  });

  it("preserves tutor intent on signup links", () => {
    expect(signupPathForRole("tutor")).toBe("/signup?role=tutor");
    expect(signupPathForRole("student")).toBe("/signup");
    expect(signupPathForRole(null)).toBe("/signup");
  });
});
