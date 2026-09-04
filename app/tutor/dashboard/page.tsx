import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Painel do professor — Aprendiz Bay",
  robots: PRIVATE_ROBOTS,
};
import TutorAvailabilityEditor from "@/components/availability/TutorAvailabilityEditor";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";
import TutorConfirmedBookings from "@/components/bookings/TutorConfirmedBookings";
import CreateHubForm from "@/components/hubs/CreateHubForm";
import IncompleteProfileBanner from "@/components/tutors/IncompleteProfileBanner";
import VerificationStatusBanner from "@/components/tutors/VerificationStatusBanner";

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["lecturer"]}>
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
          <IncompleteProfileBanner />
          <VerificationStatusBanner />
          <TutorAvailabilityEditor />
          <CreateHubForm />
          <TutorDashboardBookings />
          <TutorConfirmedBookings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
