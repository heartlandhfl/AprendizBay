import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TutorPricing from "@/components/tutor/TutorPricing";
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
    lessonTypes: ["individual", "coletivo"],
    isOnline: false,
    avatarUrl: "",
    avatarColor: "bg-emerald-100",
    isVerified: false,
    collectiveHubs: [],
    ...overrides,
  };
}

describe("TutorPricing", () => {
  it("shows individual and collective prices from stored data", () => {
    render(<TutorPricing tutor={makeTutor()} />);

    expect(screen.getByText("Aula individual")).toBeInTheDocument();
    expect(screen.getByText("Aula coletiva")).toBeInTheDocument();
    expect(screen.queryByText("Primeira aula")).not.toBeInTheDocument();
    expect(screen.queryByText("Primeira aula gratuita")).not.toBeInTheDocument();
  });

  it("hides collective pricing when that lesson type is not offered", () => {
    render(<TutorPricing tutor={makeTutor({ lessonTypes: ["individual"] })} />);

    expect(screen.getByText("Aula individual")).toBeInTheDocument();
    expect(screen.queryByText("Aula coletiva")).not.toBeInTheDocument();
  });

  it("shows a first lesson only when the tutor actually offers one", () => {
    render(
      <TutorPricing
        tutor={makeTutor({ offersFreeTrial: true, firstLessonPrice: 0 })}
      />,
    );

    expect(screen.getByText("Primeira aula gratuita")).toBeInTheDocument();
  });
});
