import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchResults from "@/components/search/SearchResults";

const { mockTrackEvent, mockFetchVerifiedTutors } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockFetchVerifiedTutors: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/tutors/client", () => ({
  fetchVerifiedTutors: mockFetchVerifiedTutors,
}));

describe("SearchResults", () => {
  beforeEach(() => {
    mockTrackEvent.mockReset();
    mockFetchVerifiedTutors.mockReset();
    mockFetchVerifiedTutors.mockResolvedValue([]);
  });

  it("tracks a results search using the query-string filters", async () => {
    render(<SearchResults initialQuery="Inglês" initialModality="online" />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("search", {
        subject: "Inglês",
        modality: "online",
        lesson_type: "todos",
        source: "results",
      });
    });
    expect(
      await screen.findByRole("heading", { name: "Resultados da Busca" }),
    ).toBeInTheDocument();
  });
});
