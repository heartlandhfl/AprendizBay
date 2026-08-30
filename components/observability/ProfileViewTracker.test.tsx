import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileViewTracker from "@/components/observability/ProfileViewTracker";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

describe("ProfileViewTracker", () => {
  it("records a profile_view for the tutor being shown", () => {
    render(<ProfileViewTracker tutorId="tutor-1" subject="Inglês" />);

    expect(mockTrackEvent).toHaveBeenCalledWith("profile_view", {
      tutor_id: "tutor-1",
      subject: "Inglês",
    });
  });
});
