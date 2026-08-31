import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IndividualSlotPicker from "@/components/tutor/IndividualSlotPicker";

const { mockFetchOccupied, mockSubscribeAvailability } = vi.hoisted(() => ({
  mockFetchOccupied: vi.fn(),
  mockSubscribeAvailability: vi.fn(),
}));

vi.mock("@/lib/bookings/service", () => ({
  fetchTutorOccupiedStarts: mockFetchOccupied,
}));

vi.mock("@/lib/availability/service", () => ({
  subscribeToTutorAvailability: mockSubscribeAvailability,
}));

describe("IndividualSlotPicker", () => {
  beforeEach(() => {
    mockFetchOccupied.mockReset();
    mockSubscribeAvailability.mockReset();
    mockFetchOccupied.mockResolvedValue([]);
    mockSubscribeAvailability.mockImplementation((_tutorId, onChange) => {
      onChange({ slots: [] });
      return () => {};
    });
  });

  it("loads occupancy from the server API instead of other students' bookings", async () => {
    render(
      <IndividualSlotPicker
        tutorId="tutor-1"
        selectedSlot={null}
        onSelectSlot={() => {}}
      />,
    );

    await waitFor(() => {
      expect(mockFetchOccupied).toHaveBeenCalledWith("tutor-1");
    });
    expect(
      screen.getByText("Este professor ainda não possui horários livres para aulas individuais."),
    ).toBeInTheDocument();
  });

  it("shows a Portuguese error when occupancy cannot be loaded", async () => {
    mockFetchOccupied.mockRejectedValue(new Error("permission-denied"));

    render(
      <IndividualSlotPicker
        tutorId="tutor-1"
        selectedSlot={null}
        onSelectSlot={() => {}}
      />,
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Não foi possível verificar horários já reservados.");
  });
});
