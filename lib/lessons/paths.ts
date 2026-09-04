import { isLecturerRole } from "@/lib/auth/roles";

export function lessonPath(bookingId: string): string {
  return `/aulas/${encodeURIComponent(bookingId)}`;
}

export function lessonBackLink(role: string | undefined): { href: string; label: string } {
  if (isLecturerRole(role)) {
    return { href: "/tutor/dashboard", label: "Voltar ao painel" };
  }
  return { href: "/bookings", label: "Voltar para minhas aulas" };
}
