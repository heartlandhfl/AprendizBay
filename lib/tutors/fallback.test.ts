import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  getMockTutorProfileForFallback,
  getMockTutorsForFallback,
} from "@/lib/tutors/fallback";

const PRODUCTION_ENV = {
  NODE_ENV: "production" as const,
  ENABLE_MOCK_TUTORS: "true",
  NEXT_PUBLIC_ENABLE_MOCK_TUTORS: "true",
};

describe("mock tutor fallback", () => {
  it("returns no tutors when NODE_ENV is production", async () => {
    const tutors = await getMockTutorsForFallback(PRODUCTION_ENV);

    expect(tutors).toEqual([]);
    expect(tutors).not.toEqual(MOCK_TUTORS);
    expect(tutors.map((tutor) => tutor.name)).not.toEqual(
      expect.arrayContaining(["Mariana Silva", "Lucas Ferreira"]),
    );
  });

  it("does not return a fictional profile in production", async () => {
    expect(await getMockTutorProfileForFallback("1", PRODUCTION_ENV)).toBeUndefined();
    expect(await getMockTutorProfileForFallback("2", PRODUCTION_ENV)).toBeUndefined();
  });

  it("still serves fixtures when development mocks are explicitly enabled", async () => {
    const tutors = await getMockTutorsForFallback({
      NODE_ENV: "development",
      ENABLE_MOCK_TUTORS: "true",
    });

    expect(tutors).toEqual(MOCK_TUTORS);
    expect(
      (
        await getMockTutorProfileForFallback("1", {
          NODE_ENV: "test",
          ENABLE_MOCK_TUTORS: "true",
        })
      )?.name,
    ).toBe("Mariana Silva");
  });
});
