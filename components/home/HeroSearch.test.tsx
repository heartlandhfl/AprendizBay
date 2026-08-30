import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HeroSearch from "@/components/home/HeroSearch";

const { mockPush, mockTrackEvent } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

describe("HeroSearch", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockTrackEvent.mockReset();
  });

  it("tracks a search and navigates to the results page", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    await user.type(screen.getByLabelText("Buscar matéria ou assunto"), "Inglês");
    await user.click(screen.getByRole("button", { name: "Presencial" }));
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(mockTrackEvent).toHaveBeenCalledWith("search", {
      query: "Inglês",
      modality: "presencial",
      source: "hero",
    });
    expect(mockPush).toHaveBeenCalledWith("/search?q=Ingl%C3%AAs&modality=presencial");
  });
});
