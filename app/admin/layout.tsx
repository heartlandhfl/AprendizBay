import { Suspense } from "react";
import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";
import RequireAuth from "@/components/auth/RequireAuth";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Administração — Aprendiz Bay",
  robots: PRIVATE_ROBOTS,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RequireAuth roles={["admin"]}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <AdminNav />
          {children}
        </div>
      </RequireAuth>
    </Suspense>
  );
}
