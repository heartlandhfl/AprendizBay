import type { Modality } from "@/lib/mock-tutors";
import type { LessonStatus } from "@/lib/lessons/status";

export const JOIN_LESSON_BUTTON_LABEL = "Entrar na aula";
export const JOIN_LESSON_EXTERNAL_HINT = "abre reunião externa";
export const JOIN_LESSON_ARIA_LABEL = "Entrar na aula (abre reunião externa)";

export function getMissingMeetingUrlMessage(status: LessonStatus): string {
  switch (status) {
    case "scheduled":
      return "O link da reunião será gerado depois que o professor confirmar e o pagamento for concluído.";
    case "payment_pending":
      return "O link da reunião será liberado assim que o pagamento for confirmado.";
    case "confirmed":
      return "O link da reunião ainda não está disponível. Atualize a página em alguns instantes ou fale com o professor pelas mensagens.";
    case "completed":
      return "Esta aula já foi concluída. O link da reunião não está mais em destaque aqui.";
    case "cancelled":
      return "Esta aula foi cancelada. O link da reunião não será disponibilizado.";
  }
}

export function getLessonImportantNotes(input: {
  status: LessonStatus;
  modality: Modality;
}): string[] {
  const notes: string[] = [];

  if (input.status === "cancelled") {
    notes.push("Esta aula foi cancelada e não acontecerá.");
    return notes;
  }

  if (input.status === "completed") {
    notes.push(
      "Esta aula já foi concluída. Se quiser, deixe uma avaliação em Minhas aulas.",
    );
    return notes;
  }

  if (input.status === "scheduled") {
    notes.push(
      "A aula está agendada. Aguarde o professor confirmar. Depois será preciso pagar para liberar o link da reunião.",
    );
  }

  if (input.status === "payment_pending") {
    notes.push(
      "O pagamento ainda não foi confirmado. O link da reunião só é liberado depois da confirmação.",
    );
  }

  if (input.status === "confirmed") {
    notes.push("Chegue alguns minutos antes do horário combinado.");
    notes.push("Não compartilhe o link da reunião com outras pessoas.");
  }

  if (input.modality === "online" || input.modality === "ambos") {
    notes.push(
      "O botão Entrar na aula abre uma reunião em um site externo, fora da Aprendiz Bay.",
    );
  }

  if (input.modality === "presencial" || input.modality === "ambos") {
    notes.push("Se a aula for presencial, combine o local com o professor pelas mensagens.");
  }

  return notes;
}
