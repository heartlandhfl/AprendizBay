import type { TutorProfileCompletion } from "@/lib/tutors/profile-completion";
import { missingProfileStepLabels } from "@/lib/tutors/profile-completion";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { STATUS_LABELS, resolveVerificationStatus } from "@/lib/tutors/verification";

export function getProfessorDashboardContextualMessage(input: {
  pendingRequestCount: number;
  upcomingLessonCount: number;
  unreadMessageCount: number;
}): string {
  if (input.upcomingLessonCount > 0) {
    return "Suas próximas aulas estão organizadas abaixo. Prepare-se para os encontros.";
  }

  if (input.pendingRequestCount > 0) {
    return "Você tem novas solicitações de aula aguardando resposta.";
  }

  if (input.unreadMessageCount > 0) {
    return "Há mensagens novas de alunos aguardando sua resposta.";
  }

  return "Gerencie sua agenda, alunos e turmas a partir deste painel.";
}

export function formatProfileStatusSummary(
  completion: TutorProfileCompletion,
  tutorDoc: FirestoreTutorDoc | null,
): {
  completionLabel: string;
  verificationLabel: string | null;
  missingLabels: string[];
} {
  const missingLabels = missingProfileStepLabels(completion.missing);

  if (completion.percentage < 100) {
    return {
      completionLabel: `Perfil ${completion.percentage}% completo`,
      verificationLabel: null,
      missingLabels,
    };
  }

  const verificationStatus = tutorDoc ? resolveVerificationStatus(tutorDoc) : "pending";

  return {
    completionLabel: "Perfil completo",
    verificationLabel: STATUS_LABELS[verificationStatus],
    missingLabels: [],
  };
}
