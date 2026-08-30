import {
  addDoc,
  collection,
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
import { conversationIdFor, previewMessage } from "@/lib/conversations/ids";
import { mapConversationDoc, mapMessageDoc } from "@/lib/conversations/map";
import {
  MAX_MESSAGE_LENGTH,
  type Conversation,
  type ConversationMessage,
  type ConversationNames,
} from "@/lib/conversations/types";

export { mapConversationDoc, mapMessageDoc } from "@/lib/conversations/map";

export async function getOrCreateConversation(
  studentId: string,
  tutorId: string,
  names: ConversationNames,
): Promise<string> {
  await requireFirebaseApp();

  const conversationId = conversationIdFor(studentId, tutorId);
  const conversationRef = doc(db, "conversations", conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    await setDoc(conversationRef, {
      studentId,
      tutorId,
      participantIds: [studentId, tutorId],
      studentName: names.studentName.trim() || "Aluno",
      tutorName: names.tutorName.trim() || "Professor",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
    throw new Error("Escreva uma mensagem para enviar.");
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  await requireFirebaseApp();

  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const docRef = await addDoc(messagesRef, {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: previewMessage(trimmed),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
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
