import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  isKnownMockInventoryItem,
  rejectMockTutorInventory,
} from "@/lib/tutors/mock-identities";

describe("mock tutor identities", () => {
  it("recognizes the audited fictional marketplace names", () => {
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
