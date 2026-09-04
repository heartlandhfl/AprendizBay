import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import BookingsPageContent from "@/components/bookings/BookingsPageContent";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Minhas reservas — Aprendiz Bay",
  description: "Acompanhe suas aulas reservadas na Aprendiz Bay.",
  robots: PRIVATE_ROBOTS,
};

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <BookingsPageContent />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
