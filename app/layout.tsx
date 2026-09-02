import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";
import ReferralCapture from "@/components/referrals/ReferralCapture";
import ObservabilityProvider from "@/components/observability/ObservabilityProvider";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { getSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Aprendiz Bay — Encontre seu professor ideal",
  description:
    "Plataforma brasileira de tutoria e aprendizado coletivo. Encontre professores particulares e participe de aulas em grupo com preços acessíveis.",
  openGraph: {
    title: "Aprendiz Bay — Encontre seu professor ideal",
    description:
      "Plataforma brasileira de tutoria e aprendizado coletivo. Encontre professores particulares e participe de aulas em grupo com preços acessíveis.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Aprendiz Bay — Encontre seu professor ideal",
    description:
      "Plataforma brasileira de tutoria e aprendizado coletivo. Encontre professores particulares e participe de aulas em grupo com preços acessíveis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col font-sans">
        <AuthProvider>
          <ObservabilityProvider />
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsentBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
