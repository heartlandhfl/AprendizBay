import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import {
  ConversationError,
  isPermissionDenied,
} from "@/lib/conversations/errors";
import {
  conversationIdFor,
  conversationReportId,
  otherParticipantId,
  previewMessage,
  userBlockId,
} from "@/lib/conversations/ids";
import { mapConversationDoc, mapMessageDoc } from "@/lib/conversations/map";
import {
  evaluateMessageRateLimit,
  rateLimitErrorMessage,
  type MessageRateLimitState,
} from "@/lib/conversations/rate-limit";
import {
  MAX_MESSAGE_LENGTH,
  MAX_REPORT_DETAILS_LENGTH,
  type BlockState,
  type Conversation,
  type ConversationMessage,
  type ConversationNames,
  type ConversationReportInput,
} from "@/lib/conversations/types";

export { mapConversationDoc, mapMessageDoc } from "@/lib/conversations/map";

function timestampToMs(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

function asRateLimitState(data: Record<string, unknown> | undefined): MessageRateLimitState | null {
  if (!data) {
    return null;
  }

  return {
    lastSentAtMs: timestampToMs(data.lastSentAt),
    windowStartedAtMs: timestampToMs(data.windowStartedAt),
    windowCount: typeof data.windowCount === "number" ? data.windowCount : 0,
  };
}

async function readBlockState(userId: string, otherUserId: string): Promise<BlockState> {
  const [mine, theirs] = await Promise.all([
    getDoc(doc(db, "userBlocks", userBlockId(userId, otherUserId))),
    getDoc(doc(db, "userBlocks", userBlockId(otherUserId, userId))),
  ]);

  return {
    blockedByMe: mine.exists(),
    blockedMe: theirs.exists(),
  };
}

export async function isPairBlocked(userId: string, otherUserId: string): Promise<boolean> {
  const state = await readBlockState(userId, otherUserId);
  return state.blockedByMe || state.blockedMe;
}

export async function assertMessagingAllowed(userId: string, otherUserId: string): Promise<void> {
  if (await isPairBlocked(userId, otherUserId)) {
    throw new ConversationError(
      "blocked",
      "Não é possível enviar mensagens porque um de vocês bloqueou o outro.",
    );
  }
}

async function claimMessageSendSlot(userId: string): Promise<void> {
  const rateRef = doc(db, "messageRateLimits", userId);
  const snapshot = await getDoc(rateRef);
  const decision = evaluateMessageRateLimit(
    snapshot.exists() ? asRateLimitState(snapshot.data() as Record<string, unknown>) : null,
    Date.now(),
  );

  if (!decision.ok) {
    throw new ConversationError("rate_limited", rateLimitErrorMessage(decision));
  }

  const payload = {
    lastSentAt: serverTimestamp(),
    windowStartedAt: decision.next.windowCount === 1 ? serverTimestamp() : snapshot.data()?.windowStartedAt,
    windowCount: decision.next.windowCount,
  };

  try {
    if (snapshot.exists()) {
      await updateDoc(rateRef, payload);
    } else {
      await setDoc(rateRef, payload);
    }
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new ConversationError(
        "rate_limited",
        "Aguarde alguns segundos antes de enviar outra mensagem.",
      );
    }

    throw new ConversationError(
      "unavailable",
      "Não foi possível enviar a mensagem agora. Tente novamente.",
    );
  }
}

export async function getOrCreateConversation(
  studentId: string,
  tutorId: string,
  names: ConversationNames,
): Promise<string> {
  await requireFirebaseApp();
  await assertMessagingAllowed(studentId, tutorId);

  const conversationId = conversationIdFor(studentId, tutorId);
  const conversationRef = doc(db, "conversations", conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    try {
      await setDoc(conversationRef, {
        studentId,
        tutorId,
        participantIds: [studentId, tutorId],
        studentName: names.studentName.trim() || "Aluno",
        tutorName: names.tutorName.trim() || "Professor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        throw new ConversationError(
          "blocked",
          "Não foi possível iniciar a conversa. Este usuário não está disponível para mensagens.",
        );
      }

      throw new ConversationError("unavailable", "Não foi possível iniciar a conversa.");
    }
  }

  return conversationId;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ConversationError("empty", "Escreva uma mensagem para enviar.");
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ConversationError(
      "oversized",
      `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
    );
  }

  await requireFirebaseApp();

  const conversationRef = doc(db, "conversations", conversationId);
  const conversationSnap = await getDoc(conversationRef);
  if (!conversationSnap.exists()) {
    throw new ConversationError("permission", "Você não tem acesso a esta conversa.");
  }

  const conversation = mapConversationDoc(
    conversationSnap.id,
    conversationSnap.data() as Record<string, unknown>,
  );
  await assertMessagingAllowed(senderId, otherParticipantId(conversation, senderId));
  await claimMessageSendSlot(senderId);

  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const docRef = await addDoc(messagesRef, {
      senderId,
      text: trimmed,
      createdAt: serverTimestamp(),
    });

    await updateDoc(conversationRef, {
      lastMessage: previewMessage(trimmed),
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    if (isConversationLikeBlocked(error)) {
      throw new ConversationError(
        "blocked",
        "Não é possível enviar mensagens porque um de vocês bloqueou o outro.",
      );
    }

    if (isPermissionDenied(error)) {
      throw new ConversationError("permission", "Você não pode enviar mensagem nesta conversa.");
    }

    throw new ConversationError("unavailable", "Não foi possível enviar a mensagem.");
  }
}

function isConversationLikeBlocked(error: unknown): boolean {
  return isConversationErrorSafe(error) && error.code === "blocked";
}

function isConversationErrorSafe(error: unknown): error is ConversationError {
  return error instanceof ConversationError;
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new ConversationError("permission", "Não foi possível bloquear este usuário.");
  }

  await requireFirebaseApp();

  try {
    await setDoc(doc(db, "userBlocks", userBlockId(blockerId, blockedId)), {
      blockerId,
      blockedId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new ConversationError("permission", "Não foi possível bloquear este usuário.");
    }

    throw new ConversationError("unavailable", "Não foi possível bloquear este usuário.");
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await requireFirebaseApp();

  try {
    await deleteDoc(doc(db, "userBlocks", userBlockId(blockerId, blockedId)));
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new ConversationError("permission", "Não foi possível desbloquear este usuário.");
    }

    throw new ConversationError("unavailable", "Não foi possível desbloquear este usuário.");
  }
}

export async function reportConversation(input: ConversationReportInput): Promise<void> {
  const details = (input.details ?? "").trim();
  if (details.length > MAX_REPORT_DETAILS_LENGTH) {
    throw new ConversationError(
      "oversized",
      `O relato deve ter no máximo ${MAX_REPORT_DETAILS_LENGTH} caracteres.`,
    );
  }

  await requireFirebaseApp();

  try {
    await setDoc(doc(db, "conversationReports", conversationReportId(input.conversationId, input.reporterId)), {
      conversationId: input.conversationId,
      reporterId: input.reporterId,
      reportedUserId: input.reportedUserId,
      reason: input.reason,
      details,
      status: "open",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new ConversationError(
        "already_reported",
        "Você já denunciou esta conversa ou não tem permissão para denunciá-la.",
      );
    }

    throw new ConversationError("unavailable", "Não foi possível enviar a denúncia.");
  }
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => {
    const leftTime =
      left.lastMessageAt?.toMillis?.() ?? left.updatedAt?.toMillis?.() ?? left.createdAt?.toMillis?.() ?? 0;
    const rightTime =
      right.lastMessageAt?.toMillis?.() ??
      right.updatedAt?.toMillis?.() ??
      right.createdAt?.toMillis?.() ??
      0;
    return rightTime - leftTime;
  });
}

export function subscribeToUserConversations(
  userId: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", userId),
    );

    return onSnapshot(
      conversationsQuery,
      (snapshot) => {
        onChange(
          sortConversations(
            snapshot.docs.map((docSnap) =>
              mapConversationDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
            ),
          ),
        );
      },
      (error) => onError?.(error),
    );
  });
}

export function subscribeToConversation(
  conversationId: string,
  onChange: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    return onSnapshot(
      doc(db, "conversations", conversationId),
      (snapshot) => {
        onChange(
          snapshot.exists()
            ? mapConversationDoc(snapshot.id, snapshot.data() as Record<string, unknown>)
            : null,
        );
      },
      (error) => onError?.(error),
    );
  });
}

export function subscribeToPairBlock(
  userId: string,
  otherUserId: string,
  onChange: (state: BlockState) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    let mine = false;
    let theirs = false;
    let mineReady = false;
    let theirsReady = false;

    function emit() {
      if (mineReady && theirsReady) {
        onChange({ blockedByMe: mine, blockedMe: theirs });
      }
    }

    const unsubscribeMine = onSnapshot(
      doc(db, "userBlocks", userBlockId(userId, otherUserId)),
      (snapshot) => {
        mine = snapshot.exists();
        mineReady = true;
        emit();
      },
      (error) => onError?.(error),
    );

    const unsubscribeTheirs = onSnapshot(
      doc(db, "userBlocks", userBlockId(otherUserId, userId)),
      (snapshot) => {
        theirs = snapshot.exists();
        theirsReady = true;
        emit();
      },
      (error) => onError?.(error),
    );

    return () => {
      unsubscribeMine();
      unsubscribeTheirs();
    };
  });
}

function sortMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt?.toMillis?.() ?? 0;
    const rightTime = right.createdAt?.toMillis?.() ?? 0;
    return leftTime - rightTime;
  });
}

export function subscribeToConversationMessages(
  conversationId: string,
  onChange: (messages: ConversationMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        onChange(
          sortMessages(
            snapshot.docs.map((docSnap) =>
              mapMessageDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
            ),
          ),
        );
      },
      (error) => onError?.(error),
    );
  });
}

export function formatMessageTime(timestamp: ConversationMessage["createdAt"]): string {
  if (!timestamp?.toDate) {
    return "";
  }

  return timestamp.toDate().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
