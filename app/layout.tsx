import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

function getMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const value of candidates) {
    const url = tryParseAbsoluteUrl(value);
    if (url) {
      return url;
    }
  }

  return new URL("http://localhost:3000");
}

function tryParseAbsoluteUrl(value: string | undefined): URL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
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
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
