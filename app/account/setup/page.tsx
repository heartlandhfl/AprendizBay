import type { Metadata } from "next";
import StudentAccountSetupPageClient from "@/components/account/StudentAccountSetupPageClient";
import { PRIVATE_ROBOTS } from "@/lib/seo/robots-policy";

export const metadata: Metadata = {
  title: "Configurar perfil — Aprendiz Bay",
  description: "Complete seu perfil para começar a aprender na Aprendiz Bay.",
  robots: PRIVATE_ROBOTS,
};

export default function StudentAccountSetupPage() {
  return <StudentAccountSetupPageClient />;
}
