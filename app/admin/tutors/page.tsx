import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import PendingTutorsList from "@/components/admin/PendingTutorsList";

export default function AdminTutorsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["admin"]}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <PendingTutorsList />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
