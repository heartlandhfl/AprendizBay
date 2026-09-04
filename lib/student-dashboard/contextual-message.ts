import type { EnrichedStudentBooking } from "@/lib/student-dashboard/types";

export function getDashboardContextualMessage(input: {
  nextLesson: EnrichedStudentBooking | null;
  pendingActionCount: number;
  unreadMessageCount: number;
}): string {
  if (input.nextLesson) {
    return "Sua próxima aula está chegando. Prepare-se para o encontro.";
  }

  if (input.pendingActionCount > 0) {
    return "Você tem pendências nas suas reservas. Resolva-as para seguir com suas aulas.";
  }

  if (input.unreadMessageCount > 0) {
    return "Você tem mensagens novas de professores.";
  }

  return "Encontre um professor e comece sua próxima aula.";
}
