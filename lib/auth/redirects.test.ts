import { describe, expect, it } from "vitest";
import {
  panelLabelForRole,
  panelPathForRole,
  postAuthPathForRole,
  primaryNavItemsForRole,
  signupPathForRole,
} from "@/lib/auth/redirects";

describe("auth redirects", () => {
  it("routes professors to onboarding after login", () => {
    expect(postAuthPathForRole("tutor")).toBe("/tutor/onboarding");
    expect(postAuthPathForRole("lecturer")).toBe("/tutor/onboarding");
  });

  it("routes onboarded professors to the lecturer dashboard panel", () => {
    expect(panelPathForRole("tutor")).toBe("/tutor/dashboard");
    expect(panelPathForRole("lecturer")).toBe("/tutor/dashboard");
  });

  it("routes students to the student dashboard", () => {
    expect(postAuthPathForRole("student")).toBe("/dashboard");
    expect(panelPathForRole("student")).toBe("/dashboard");
  });

  it("routes facilitators to the facilitator panel instead of bookings", () => {
    expect(postAuthPathForRole("facilitator")).toBe("/facilitador");
    expect(panelPathForRole("facilitator")).toBe("/facilitador");
  });

  it("preserves admin and support destinations", () => {
    expect(postAuthPathForRole("admin")).toBe("/admin");
    expect(panelPathForRole("admin")).toBe("/admin");
    expect(postAuthPathForRole("support")).toBe("/");
    expect(panelPathForRole("support")).toBe("/");
  });

  it("does not fall through unknown roles to bookings", () => {
    expect(postAuthPathForRole(undefined)).toBe("/");
    expect(postAuthPathForRole(null)).toBe("/");
  });

  it("preserves tutor intent on signup links", () => {
    expect(signupPathForRole("tutor")).toBe("/signup?role=tutor");
    expect(signupPathForRole("student")).toBe("/signup");
    expect(signupPathForRole("lecturer")).toBe("/signup");
    expect(signupPathForRole(null)).toBe("/signup");
  });

  it("builds canonical navigation for each role", () => {
    expect(primaryNavItemsForRole("student")).toEqual([
      { href: "/dashboard", label: "Início" },
      { href: "/search", label: "Encontrar Professor" },
      { href: "/bookings", label: "Minhas Aulas" },
      { href: "/mensagens", label: "Mensagens" },
    ]);
    expect(primaryNavItemsForRole("lecturer")).toEqual([
      { href: "/tutor/dashboard", label: "Meu painel" },
    ]);
    expect(primaryNavItemsForRole("tutor")).toEqual([
      { href: "/tutor/dashboard", label: "Meu painel" },
    ]);
    expect(primaryNavItemsForRole("facilitator")).toEqual([
      { href: "/", label: "Início" },
      { href: "/facilitador", label: "Painel do Facilitador" },
    ]);
    expect(primaryNavItemsForRole("admin")).toEqual([
      { href: "/admin", label: "Painel admin" },
    ]);
    expect(panelLabelForRole("lecturer")).toBe("Meu painel");
    expect(panelLabelForRole("admin")).toBe("Painel admin");
  });
});
