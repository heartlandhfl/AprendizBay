import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TutorCard from "@/components/search/TutorCard";
import type { Tutor } from "@/lib/mock-tutors";

const baseTutor: Tutor = {
  id: "1",
  name: "Mariana Silva",
  subject: "Inglês",
  city: "São Paulo",
  state: "SP",
  rating: 4.9,
  reviewCount: 10,
  bio: "Professora de inglês.",
  individualPrice: 70,
  collectivePrice: 25,
  modality: "online",
  lessonTypes: ["individual", "coletivo"],
  isOnline: true,
  avatarUrl: "https://example.com/a.png",
  avatarColor: "bg-emerald-100",
  isVerified: true,
};

describe("TutorCard", () => {
  it("shows aula individual and aula coletiva when both are offered", () => {
    render(<TutorCard tutor={baseTutor} />);

    expect(screen.getByText("Aula individual")).toBeInTheDocument();
    expect(screen.getByText("Aula coletiva")).toBeInTheDocument();
    expect(screen.getByText("Professor verificado")).toBeInTheDocument();
  });

  it("hides aula coletiva when the tutor only offers individual lessons", () => {
    render(
      <TutorCard
        tutor={{ ...baseTutor, lessonTypes: ["individual"], collectivePrice: 0 }}
      />,
    );

    expect(screen.getByText("Aula individual")).toBeInTheDocument();
    expect(screen.queryByText("Aula coletiva")).not.toBeInTheDocument();
  });
});
