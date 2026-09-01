import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  fingerprintMockIdentity,
  isKnownMockInventoryItem,
  rejectMockTutorInventory,
} from "@/lib/tutors/mock-identities";

const FIXTURE_NAMES = [
  "Mariana Silva",
  "Lucas Ferreira",
  "Rodrigo Almeida",
  "Fernanda Costa",
  "André Martins",
];

describe("mock tutor identities", () => {
  it("does not embed fixture names in the production guard module", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/tutors/mock-identities.ts"), "utf8");
    for (const name of FIXTURE_NAMES) {
      expect(source).not.toContain(name);
    }
    expect(source).not.toContain("hub-m1");
    expect(source).not.toMatch(/name: "Mariana/);
  });

  it("recognizes the audited fictional marketplace names by fingerprint", () => {
    expect(fingerprintMockIdentity("Mariana Silva")).toBe("122af905");
    expect(isKnownMockInventoryItem({ name: "Mariana Silva" })).toBe(true);
    expect(isKnownMockInventoryItem({ id: "1" })).toBe(true);
    expect(isKnownMockInventoryItem({ id: "hub-m1" })).toBe(true);
    expect(isKnownMockInventoryItem({ name: "Ana Souza", id: "tutor_real" })).toBe(false);
  });

  it("strips mock inventory only in production", () => {
    const mixed = [
      ...MOCK_TUTORS,
      { id: "tutor_real", name: "Ana Souza", rating: 4.2, reviewCount: 3 },
    ];

    expect(rejectMockTutorInventory(mixed, { NODE_ENV: "test" })).toEqual(mixed);
    expect(
      rejectMockTutorInventory(mixed, { NODE_ENV: "production" }).map((tutor) => tutor.name),
    ).toEqual(["Ana Souza"]);
    expect(
      rejectMockTutorInventory(["1", "tutor_real"], { NODE_ENV: "production" }),
    ).toEqual(["tutor_real"]);
  });
});
