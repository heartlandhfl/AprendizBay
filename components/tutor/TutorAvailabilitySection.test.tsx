import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorAvailabilitySection from "@/components/tutor/TutorAvailabilitySection";

const { mockSubscribe } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
}));

vi.mock("@/lib/availability/service", () => ({
  subscribeToTutorAvailability: mockSubscribe,
}));

describe("TutorAvailabilitySection", () => {
  it("shows an empty state when the tutor has no saved hours", async () => {
    mockSubscribe.mockImplementation((_tutorId, onChange) => {
      onChange({ slots: [] });
      return () => undefined;
    });

    render(<TutorAvailabilitySection tutorId="tutor-1" />);

    expect(
      await screen.findByText(
        "Este professor ainda não cadastrou horários de disponibilidade.",
      ),
    ).toBeInTheDocument();
  });

  it("lists stored weekday ranges", async () => {
    mockSubscribe.mockImplementation((_tutorId, onChange) => {
      onChange({
        slots: [{ weekday: 2, startTime: "19:00", endTime: "20:00" }],
      });
      return () => undefined;
    });

    render(<TutorAvailabilitySection tutorId="tutor-1" />);

    expect(await screen.findByText("Terça-feira")).toBeInTheDocument();
    expect(screen.getByText("19:00–20:00")).toBeInTheDocument();
  });

  it("shows an error state when availability cannot be loaded", async () => {
    mockSubscribe.mockImplementation((_tutorId, _onChange, onError) => {
      onError?.(new Error("unavailable"));
      return () => undefined;
    });

    render(<TutorAvailabilitySection tutorId="tutor-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a disponibilidade.",
    );
  });
});
