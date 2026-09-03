import type { Firestore } from "firebase-admin/firestore";

import type { ContactEmailDelivery } from "@/lib/contact/types";
import type { ContactFormInput } from "@/lib/contact/send-contact-message";

export const CONTACT_INBOX_COLLECTION = "contactInbox";

export interface PersistContactMessageMeta {
  emailDelivery: ContactEmailDelivery;
  emailSkipReason?: string;
}

export async function persistContactMessage(
  db: Firestore,
  input: ContactFormInput,
  meta: PersistContactMessageMeta,
): Promise<string> {
  const { FieldValue } = await import("firebase-admin/firestore");

  const docRef = await db.collection(CONTACT_INBOX_COLLECTION).add({
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    emailDelivery: meta.emailDelivery,
    emailSkipReason: meta.emailSkipReason ?? null,
    status: "unread",
    assignedTo: null,
    readAt: null,
    respondedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}
