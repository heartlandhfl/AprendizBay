import { describe, expect, it } from "vitest";
import {
  normalizeStringList,
  positiveNumber,
  trimToUndefined,
  tutorInitials,
} from "@/lib/tutors/strings";

describe("tutor profile string helpers", () => {
  it("drops blank strings and empty lists", () => {
    expect(trimToUndefined("  ")).toBeUndefined();
    expect(trimToUndefined("CELTA")).toBe("CELTA");
    expect(normalizeStringList(["", " CELTA ", null])).toEqual(["CELTA"]);
    expect(positiveNumber(0)).toBeUndefined();
    expect(positiveNumber(12)).toBe(12);
  });

  it("builds initials from the stored name", () => {
    expect(tutorInitials("Mariana Silva")).toBe("MS");
    expect(tutorInitials("Ana")).toBe("AN");
    expect(tutorInitials("")).toBe("P");
  });
});
