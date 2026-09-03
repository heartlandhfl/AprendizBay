import type { Firestore } from "firebase-admin/firestore";
import type { NotificationRequest } from "@/lib/notifications/types";

/** Notification types that may be requested by authenticated clients via POST /api/notifications. */
export const CLIENT_NOTIFICATION_TYPES = new Set<NotificationRequest["type"]>([
  "user_registered",
  "email_verification",
  "pending_booking",
  "booking_accepted",
  "tutor_verification_submitted",
  "new_review",
  "new_message",
]);

export class NotificationAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationAuthorizationError";
  }
}

async function loadBooking(db: Firestore, bookingId: string) {
  const snapshot = await db.collection("bookings").doc(bookingId).get();
  if (!snapshot.exists) {
    throw new NotificationAuthorizationError("Reserva não encontrada.");
  }
  return {
    id: snapshot.id,
    data: snapshot.data() ?? {},
  };
}

async function resolveTutorOwnerUid(db: Firestore, tutorId: string): Promise<string> {
  const snapshot = await db.collection("tutors").doc(tutorId).get();
  const userId = snapshot.data()?.userId;
  if (typeof userId === "string" && userId.trim()) {
    return userId.trim();
  }
  return tutorId;
}

async function callerOwnsTutor(db: Firestore, callerUid: string, tutorId: string): Promise<boolean> {
  if (!tutorId) {
    return false;
  }
  if (callerUid === tutorId) {
    return true;
  }
  const ownerUid = await resolveTutorOwnerUid(db, tutorId);
  return callerUid === ownerUid;
}

function isConversationParticipant(
  conversation: Record<string, unknown>,
  userId: string,
): boolean {
  const studentId = String(conversation.studentId ?? "");
  const tutorId = String(conversation.tutorId ?? "");
  if (userId === studentId || userId === tutorId) {
    return true;
  }
  const participantIds = conversation.participantIds;
  return Array.isArray(participantIds) && participantIds.includes(userId);
}

async function isCallerConversationParticipant(
  db: Firestore,
  conversation: Record<string, unknown>,
  callerUid: string,
): Promise<boolean> {
  if (isConversationParticipant(conversation, callerUid)) {
    return true;
  }

  const tutorId = String(conversation.tutorId ?? "");
  return Boolean(tutorId) && (await callerOwnsTutor(db, callerUid, tutorId));
}

async function callerSentMessage(
  db: Firestore,
  callerUid: string,
  conversationId: string,
  messageId: string,
): Promise<void> {
  const messageSnap = await db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .doc(messageId)
    .get();
  if (!messageSnap.exists) {
    throw new NotificationAuthorizationError("Mensagem não encontrada.");
  }

  const senderId = String(messageSnap.data()?.senderId ?? "");
  if (!senderId) {
    throw new NotificationAuthorizationError("Remetente da mensagem inválido.");
  }

  if (senderId === callerUid) {
    return;
  }

  if (await callerOwnsTutor(db, callerUid, senderId)) {
    return;
  }

  throw new NotificationAuthorizationError(
    "Somente o remetente pode solicitar a notificação desta mensagem.",
  );
}

export async function authorizeNotificationRequest(
  db: Firestore,
  callerUid: string,
  request: NotificationRequest,
): Promise<void> {
  if (!callerUid.trim()) {
    throw new NotificationAuthorizationError("Usuário não autenticado.");
  }

  if (!CLIENT_NOTIFICATION_TYPES.has(request.type)) {
    throw new NotificationAuthorizationError("Tipo de notificação não permitido.");
  }

  switch (request.type) {
    case "user_registered":
    case "email_verification": {
      if (!request.userId?.trim()) {
        throw new NotificationAuthorizationError("Informe o identificador do usuário.");
      }
      if (request.userId !== callerUid) {
        throw new NotificationAuthorizationError(
          "Não é permitido solicitar e-mails para outro usuário.",
        );
      }
      return;
    }

    case "pending_booking": {
      if (!request.bookingId?.trim()) {
        throw new NotificationAuthorizationError("Informe o identificador da reserva.");
      }
      const booking = await loadBooking(db, request.bookingId);
      if (String(booking.data.studentId ?? "") !== callerUid) {
        throw new NotificationAuthorizationError(
          "Somente o aluno da reserva pode solicitar este e-mail.",
        );
      }
      return;
    }

    case "booking_accepted": {
      if (!request.bookingId?.trim()) {
        throw new NotificationAuthorizationError("Informe o identificador da reserva.");
      }
      const booking = await loadBooking(db, request.bookingId);
      const tutorId = String(booking.data.tutorId ?? "");
      if (!(await callerOwnsTutor(db, callerUid, tutorId))) {
        throw new NotificationAuthorizationError(
          "Somente o professor da reserva pode solicitar este e-mail.",
        );
      }
      return;
    }

    case "tutor_verification_submitted": {
      if (!request.tutorId?.trim()) {
        throw new NotificationAuthorizationError("Informe o identificador do professor.");
      }
      if (!(await callerOwnsTutor(db, callerUid, request.tutorId))) {
        throw new NotificationAuthorizationError(
          "Somente o professor pode solicitar este e-mail.",
        );
      }
      return;
    }

    case "new_review": {
      if (!request.reviewId?.trim()) {
        throw new NotificationAuthorizationError("Informe o identificador da avaliação.");
      }
      const reviewSnap = await db.collection("reviews").doc(request.reviewId).get();
      if (!reviewSnap.exists) {
        throw new NotificationAuthorizationError("Avaliação não encontrada.");
      }
      if (String(reviewSnap.data()?.studentId ?? "") !== callerUid) {
        throw new NotificationAuthorizationError(
          "Somente o autor da avaliação pode solicitar este e-mail.",
        );
      }
      return;
    }

    case "new_message": {
      if (!request.conversationId?.trim() || !request.messageId?.trim() || !request.recipientUserId?.trim()) {
        throw new NotificationAuthorizationError(
          "Informe a conversa, a mensagem e o destinatário.",
        );
      }

      const conversationSnap = await db.collection("conversations").doc(request.conversationId).get();
      if (!conversationSnap.exists) {
        throw new NotificationAuthorizationError("Conversa não encontrada.");
      }

      const conversation = conversationSnap.data() ?? {};
      if (!(await isCallerConversationParticipant(db, conversation, callerUid))) {
        throw new NotificationAuthorizationError("Você não participa desta conversa.");
      }

      await callerSentMessage(db, callerUid, request.conversationId, request.messageId);

      const messageSnap = await db
        .collection("conversations")
        .doc(request.conversationId)
        .collection("messages")
        .doc(request.messageId)
        .get();
      const senderId = String(messageSnap.data()?.senderId ?? "");
      const studentId = String(conversation.studentId ?? "");
      const tutorId = String(conversation.tutorId ?? "");
      const expectedRecipient = senderId === studentId ? tutorId : studentId;

      if (request.recipientUserId !== expectedRecipient) {
        throw new NotificationAuthorizationError("Destinatário inválido para esta mensagem.");
      }

      if (request.recipientUserId === callerUid) {
        throw new NotificationAuthorizationError("Não é possível notificar a si mesmo.");
      }

      return;
    }

    default: {
      const exhaustive: never = request.type;
      throw new NotificationAuthorizationError(`Tipo de notificação não permitido: ${exhaustive}`);
    }
  }
}
