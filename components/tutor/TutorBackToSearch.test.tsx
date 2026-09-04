import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorBackToSearch from "@/components/tutor/TutorBackToSearch";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("from=%2Fsearch%3Fsubject%3DIngl%C3%AAs"),
}));

describe("TutorBackToSearch", () => {
  it("returns to the sanitized search URL when provided", () => {
    render(<TutorBackToSearch />);

    expect(screen.getByRole("link", { name: "Voltar aos resultados" })).toHaveAttribute(
      "href",
      "/search?subject=Inglês",
    );
  });
});
