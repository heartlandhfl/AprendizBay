import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <TutorDashboardBookings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
