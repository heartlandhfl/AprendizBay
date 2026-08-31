import { Suspense } from "react";
import type { Metadata } from "next";
import RequireAuth from "@/components/auth/RequireAuth";
import AccountSettings from "@/components/settings/AccountSettings";

export const metadata: Metadata = {
  title: "Configurações — Aprendiz Bay",
  description: "Gerencie sua conta, cookies e a exclusão de dados prevista na LGPD.",
  robots: { index: false, follow: false },
};

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <AccountSettings />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
