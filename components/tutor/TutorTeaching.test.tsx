import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TutorTeaching from "@/components/tutor/TutorTeaching";
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
    bio: "Bio",
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

describe("TutorTeaching", () => {
  it("always shows the stored subject as a discipline", () => {
    render(<TutorTeaching tutor={makeTutor()} />);

    expect(screen.getByRole("heading", { name: "Ensino" })).toBeInTheDocument();
    expect(screen.getByText("Disciplinas")).toBeInTheDocument();
    expect(screen.getByText("Inglês")).toBeInTheDocument();
    expect(screen.queryByText("Níveis")).not.toBeInTheDocument();
    expect(screen.queryByText("Idiomas")).not.toBeInTheDocument();
    expect(screen.queryByText("Especialidades")).not.toBeInTheDocument();
  });

  it("shows optional teaching details only when they exist", () => {
    render(
      <TutorTeaching
        tutor={makeTutor({
          subjects: ["Inglês", "TOEFL"],
          levels: ["Básico"],
          languages: ["Português"],
          specialties: ["Viagem"],
        })}
      />,
    );

    expect(screen.getByText("TOEFL")).toBeInTheDocument();
    expect(screen.getByText("Níveis")).toBeInTheDocument();
    expect(screen.getByText("Básico")).toBeInTheDocument();
    expect(screen.getByText("Idiomas")).toBeInTheDocument();
    expect(screen.getByText("Português")).toBeInTheDocument();
    expect(screen.getByText("Especialidades")).toBeInTheDocument();
    expect(screen.getByText("Viagem")).toBeInTheDocument();
  });
});
