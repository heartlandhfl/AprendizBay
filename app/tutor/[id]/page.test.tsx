import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTutorProfile } from "@/lib/tutor-profiles";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/tutors/server", () => ({
  fetchTutorProfile: vi.fn(),
  fetchAllTutorIds: vi.fn(),
}));

vi.mock("@/components/observability/ProfileViewTracker", () => ({
  default: () => null,
}));
vi.mock("@/components/tutor/TutorHeader", () => ({
  default: ({ tutor }: { tutor: { name: string } }) => <h1>{tutor.name}</h1>,
}));
vi.mock("@/components/tutor/TutorAbout", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorTeaching", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorPricing", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorAvailabilitySection", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorCollectiveClasses", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorReviews", () => ({ default: () => null }));
vi.mock("@/components/tutor/TutorStickyActions", () => ({ default: () => null }));
vi.mock("@/components/tutor/BookingWidget", () => ({ default: () => null }));
vi.mock("@/components/conversations/SendMessageButton", () => ({ default: () => null }));

import TutorPage, { generateMetadata, generateStaticParams } from "@/app/tutor/[id]/page";
import { okTutorList } from "@/lib/tutors/catalog";
import { fetchAllTutorIds, fetchTutorProfile } from "@/lib/tutors/server";

const fetchTutorProfileMock = vi.mocked(fetchTutorProfile);
const fetchAllTutorIdsMock = vi.mocked(fetchAllTutorIds);

describe("/tutor/[id]", () => {
  beforeEach(() => {
    fetchTutorProfileMock.mockReset();
    fetchAllTutorIdsMock.mockReset();
  });

  it("prerenders only indexable tutor ids", async () => {
    fetchAllTutorIdsMock.mockResolvedValue(okTutorList(["real-tutor"]));

    await expect(generateStaticParams()).resolves.toEqual([{ id: "real-tutor" }]);
  });

  it("does not prerender mock tutor pages when Firebase is empty or unavailable", async () => {
    fetchAllTutorIdsMock.mockResolvedValue({ state: "empty", items: [] });
    await expect(generateStaticParams()).resolves.toEqual([]);

    fetchAllTutorIdsMock.mockResolvedValue({ state: "unavailable", items: [] });
    await expect(generateStaticParams()).resolves.toEqual([]);
  });

  it("builds Portuguese metadata and a canonical URL for a real tutor", async () => {
    const tutor = getTutorProfile("1")!;
    fetchTutorProfileMock.mockResolvedValue({ state: "ok", tutor });

    const metadata = await generateMetadata({ params: { id: "1" } });

    expect(metadata.title).toBe("Mariana Silva — Inglês | Aprendiz Bay");
    expect(metadata.description).toMatch(/Inglês|viagens|carreira/);
    expect(metadata.alternates).toEqual({ canonical: "/tutor/1" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("does not index a missing tutor", async () => {
    fetchTutorProfileMock.mockResolvedValue({ state: "not_found" });

    const metadata = await generateMetadata({ params: { id: "missing" } });

    expect(metadata.title).toBe("Professor não encontrado — Aprendiz Bay");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("renders JSON-LD only for the loaded tutor", async () => {
    const tutor = getTutorProfile("1")!;
    fetchTutorProfileMock.mockResolvedValue({ state: "ok", tutor });

    const { container } = render(await TutorPage({ params: { id: "1" } }));

    expect(screen.getByRole("heading", { name: "Mariana Silva" })).toBeInTheDocument();
    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLd?.textContent).toContain('"@type":"Person"');
    expect(jsonLd?.textContent).toContain("Mariana Silva");
    expect(jsonLd?.textContent).toContain("AggregateRating");
    expect(jsonLd?.textContent).not.toContain('"@type":"Review"');
  });

  it("omits rating structured data when the tutor has no reviews", async () => {
    const tutor = { ...getTutorProfile("1")!, rating: 0, reviewCount: 0 };
    fetchTutorProfileMock.mockResolvedValue({ state: "ok", tutor });

    const { container } = render(await TutorPage({ params: { id: "1" } }));
    const jsonLd = container.querySelector('script[type="application/ld+json"]');

    expect(jsonLd?.textContent).toContain('"@type":"Person"');
    expect(jsonLd?.textContent).not.toContain("AggregateRating");
  });

  it("returns 404 when the tutor does not exist", async () => {
    fetchTutorProfileMock.mockResolvedValue({ state: "not_found" });

    await expect(TutorPage({ params: { id: "missing" } })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
