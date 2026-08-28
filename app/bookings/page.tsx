import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import StudentBookingsList from "@/components/bookings/StudentBookingsList";

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["student"]}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <StudentBookingsList />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
