import { describe, expect, it } from "vitest";
import { allowMockTutorFallback } from "@/lib/tutors/fallback";

describe("allowMockTutorFallback", () => {
  it("is off in production so demo tutors are not indexed", () => {
    expect(allowMockTutorFallback({ NODE_ENV: "production" })).toBe(false);
  });

  it("is on in development for local previews", () => {
    expect(allowMockTutorFallback({ NODE_ENV: "development" })).toBe(true);
  });

  it("honors an explicit SEO_ALLOW_MOCK_TUTORS override", () => {
    expect(allowMockTutorFallback({ NODE_ENV: "production", SEO_ALLOW_MOCK_TUTORS: "1" })).toBe(
      true,
    );
    expect(allowMockTutorFallback({ NODE_ENV: "development", SEO_ALLOW_MOCK_TUTORS: "0" })).toBe(
      false,
    );
  });
});
