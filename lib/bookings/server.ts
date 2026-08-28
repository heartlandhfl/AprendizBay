import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { generateMeetingUrl } from "@/lib/bookings/meeting";

let adminApp: App | undefined;

function getAdminFirestore(): Firestore | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!adminApp) {
    adminApp =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
  }

  return getFirestore(adminApp);
}

/** For payment webhooks or other server-side confirmation flows. */
export async function confirmBookingWithMeetingUrl(bookingId: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin SDK is not configured.");
  }

  await db.collection("bookings").doc(bookingId).update({
    status: "confirmed",
    meetingUrl: generateMeetingUrl(bookingId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
