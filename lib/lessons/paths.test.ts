import { describe, expect, it } from "vitest";
import { lessonBackLink, lessonPath } from "@/lib/lessons/paths";

describe("lesson paths", () => {
  it("builds a lesson url", () => {
    expect(lessonPath("booking-1")).toBe("/aulas/booking-1");
  });

  it("sends lecturers and legacy tutors back to the professor panel", () => {
    expect(lessonBackLink("lecturer")).toEqual({
      href: "/tutor/dashboard",
      label: "Voltar ao painel",
    });
    expect(lessonBackLink("tutor")).toEqual({
      href: "/tutor/dashboard",
      label: "Voltar ao painel",
    });
  });

  it("sends students back to bookings", () => {
    expect(lessonBackLink("student")).toEqual({
      href: "/bookings",
      label: "Voltar para minhas aulas",
    });
  });
});
