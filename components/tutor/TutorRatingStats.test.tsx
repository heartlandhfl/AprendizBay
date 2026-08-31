import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorRatingStats from "@/components/tutor/TutorRatingStats";

vi.mock("@/lib/firebase/client", () => ({
  db: {},
  whenFirebaseReady: () => () => undefined,
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe("TutorRatingStats", () => {
  it("does not show a fake score when there are no reviews", () => {
    render(
      <TutorRatingStats tutorId="tutor-1" initialRating={0} initialReviewCount={0} />,
    );

    expect(screen.getByText("Ainda sem avaliações")).toBeInTheDocument();
    expect(screen.queryByText("0,0")).not.toBeInTheDocument();
  });

  it("shows the stored rating and review count", () => {
    render(
      <TutorRatingStats tutorId="tutor-1" initialRating={4.8} initialReviewCount={12} />,
    );

    expect(screen.getByText("4,8")).toBeInTheDocument();
    expect(screen.getByText("(12 avaliações)")).toBeInTheDocument();
  });
});
