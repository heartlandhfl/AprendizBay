import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";
import TutorConfirmedBookings from "@/components/bookings/TutorConfirmedBookings";
import CreateHubForm from "@/components/hubs/CreateHubForm";

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
          <CreateHubForm />
          <TutorDashboardBookings />
          <TutorConfirmedBookings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
