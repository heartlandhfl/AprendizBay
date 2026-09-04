export function lessonPath(bookingId: string): string {
  return `/aulas/${encodeURIComponent(bookingId)}`;
}

export function lessonBackLink(role: string | undefined): { href: string; label: string } {
  if (role === "tutor") {
    return { href: "/tutor/dashboard", label: "Voltar ao painel" };
  }
  if (role === "student") {
    return { href: "/dashboard", label: "Voltar ao início" };
  }
  return { href: "/bookings", label: "Voltar para minhas aulas" };
}
