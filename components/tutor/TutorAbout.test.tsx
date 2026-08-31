import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TutorAbout from "@/components/tutor/TutorAbout";
import type { TutorProfile } from "@/lib/tutor-profiles";

function makeTutor(overrides: Partial<TutorProfile> = {}): TutorProfile {
  return {
    id: "1",
    name: "Ana",
    subject: "Inglês",
    city: "Recife",
    state: "PE",
    rating: 0,
    reviewCount: 0,
    bio: "",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "online",
    lessonTypes: ["individual"],
    isOnline: false,
    avatarUrl: "",
    avatarColor: "bg-emerald-100",
    isVerified: false,
    collectiveHubs: [],
    ...overrides,
  };
}

describe("TutorAbout", () => {
  it("shows an empty state when there is no stored presentation", () => {
    render(<TutorAbout tutor={makeTutor()} />);

    expect(screen.getByRole("heading", { name: "Sobre" })).toBeInTheDocument();
    expect(
      screen.getByText("Este professor ainda não escreveu uma apresentação."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Qualificações")).not.toBeInTheDocument();
    expect(screen.queryByText("Metodologia")).not.toBeInTheDocument();
  });

  it("renders only the about sections that have data", () => {
    render(
      <TutorAbout
        tutor={makeTutor({
          about: "Gosto de ensinar conversação.",
          methodology: "Aulas práticas.",
          experience: "Dez anos em escolas.",
          qualifications: ["CELTA"],
          hoursTaught: 200,
        })}
      />,
    );

    expect(screen.getByText("Apresentação")).toBeInTheDocument();
    expect(screen.getByText("Gosto de ensinar conversação.")).toBeInTheDocument();
    expect(screen.getByText("Experiência")).toBeInTheDocument();
    expect(screen.getByText("Dez anos em escolas.")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("Qualificações")).toBeInTheDocument();
    expect(screen.getByText("CELTA")).toBeInTheDocument();
    expect(screen.getByText("Metodologia")).toBeInTheDocument();
    expect(screen.getByText("Aulas práticas.")).toBeInTheDocument();
  });
});
