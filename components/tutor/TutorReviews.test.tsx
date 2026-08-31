import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorReviews from "@/components/tutor/TutorReviews";

const { mockSubscribe } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
}));

vi.mock("@/lib/reviews/client", () => ({
  subscribeToTutorReviews: mockSubscribe,
}));

describe("TutorReviews", () => {
  it("shows a loading state and then the empty state", async () => {
    mockSubscribe.mockImplementation((_tutorId, onChange) => {
      onChange([]);
      return () => undefined;
    });

    render(
      <TutorReviews tutorId="tutor-1" initialRating={0} initialReviewCount={0} />,
    );

    expect(
      await screen.findByText("Este professor ainda não recebeu avaliações."),
    ).toBeInTheDocument();
    expect(screen.queryByText("4,9")).not.toBeInTheDocument();
  });

  it("renders stored review comments and ratings", async () => {
    mockSubscribe.mockImplementation((_tutorId, onChange) => {
      onChange([
        {
          id: "review-1",
          rating: 5,
          comment: "Aula clara e objetiva.",
          createdAt: new Date("2026-08-01T12:00:00Z"),
        },
      ]);
      return () => undefined;
    });

    render(
      <TutorReviews tutorId="tutor-1" initialRating={5} initialReviewCount={1} />,
    );

    expect(await screen.findByText("Aula clara e objetiva.")).toBeInTheDocument();
    expect(screen.getByText("(1 avaliação)")).toBeInTheDocument();
  });

  it("shows an error state when reviews cannot be loaded", async () => {
    mockSubscribe.mockImplementation((_tutorId, _onChange, onError) => {
      onError?.(new Error("unavailable"));
      return () => undefined;
    });

    render(
      <TutorReviews tutorId="tutor-1" initialRating={0} initialReviewCount={0} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as avaliações.",
    );
  });
});
