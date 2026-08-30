import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import TutorProfileSettings from "@/components/tutors/TutorProfileSettings";

export default function TutorSettingsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["tutor"]}>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <TutorProfileSettings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
