import { describe, expect, it } from "vitest";
import {
  areMockTutorsEnabled,
  assertDevSeedAllowed,
  isDevelopmentOrTestNodeEnv,
  isProductionNodeEnv,
} from "@/lib/tutors/mock-gate";

describe("areMockTutorsEnabled", () => {
  it("never enables mocks when NODE_ENV is production, even with every flag set", () => {
    expect(
      areMockTutorsEnabled({
        NODE_ENV: "production",
        ENABLE_MOCK_TUTORS: "true",
        NEXT_PUBLIC_ENABLE_MOCK_TUTORS: "1",
        ALLOW_DEV_SEED: "true",
      }),
    ).toBe(false);
  });

  it("stays off in development and test until a flag is set", () => {
    expect(areMockTutorsEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(areMockTutorsEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("allows mocks in development or test when explicitly enabled", () => {
    expect(
      areMockTutorsEnabled({ NODE_ENV: "development", ENABLE_MOCK_TUTORS: "true" }),
    ).toBe(true);
    expect(
      areMockTutorsEnabled({
        NODE_ENV: "test",
        NEXT_PUBLIC_ENABLE_MOCK_TUTORS: "yes",
      }),
    ).toBe(true);
  });

  it("treats unknown NODE_ENV as production-safe", () => {
    expect(
      areMockTutorsEnabled({ NODE_ENV: "staging", ENABLE_MOCK_TUTORS: "true" }),
    ).toBe(false);
    expect(isProductionNodeEnv({ NODE_ENV: "production" })).toBe(true);
    expect(isDevelopmentOrTestNodeEnv({ NODE_ENV: "test" })).toBe(true);
  });
});

describe("assertDevSeedAllowed", () => {
  it("refuses to seed mock tutors in production", () => {
    expect(() =>
      assertDevSeedAllowed({
        NODE_ENV: "production",
        ENABLE_MOCK_TUTORS: "true",
        ALLOW_DEV_SEED: "true",
      }),
    ).toThrow(/não pode rodar em produção/);
  });

  it("requires an explicit development flag", () => {
    expect(() => assertDevSeedAllowed({ NODE_ENV: "development" })).toThrow(
      /ENABLE_MOCK_TUTORS|ALLOW_DEV_SEED/,
    );
    expect(() =>
      assertDevSeedAllowed({ NODE_ENV: "development", ALLOW_DEV_SEED: "true" }),
    ).not.toThrow();
    expect(() => assertDevSeedAllowed({ ENABLE_MOCK_TUTORS: "true" })).not.toThrow();
  });
});
