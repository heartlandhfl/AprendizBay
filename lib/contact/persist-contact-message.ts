import type { Firestore } from "firebase-admin/firestore";

import type { ContactFormInput } from "@/lib/contact/send-contact-message";

export interface ContactInboxRecord extends ContactFormInput {
  createdAt: Date;
  emailDelivery: "sent" | "skipped" | "failed";
  emailSkipReason?: string;
}

export async function persistContactMessage(
  db: Firestore,
  input: ContactFormInput,
  meta: { emailDelivery: ContactInboxRecord["emailDelivery"]; emailSkipReason?: string },
): Promise<void> {
  const { FieldValue } = await import("firebase-admin/firestore");

  await db.collection("contactInbox").add({
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    emailDelivery: meta.emailDelivery,
    emailSkipReason: meta.emailSkipReason ?? null,
    createdAt: FieldValue.serverTimestamp(),
    source: "contact-form",
  });
}
