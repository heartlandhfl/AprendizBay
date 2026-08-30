import { auth, requireFirebaseApp } from "@/lib/firebase/client";
import type { NotificationRequest } from "@/lib/notifications/types";

export async function requestNotification(event: NotificationRequest): Promise<void> {
  try {
    await requireFirebaseApp();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const user = auth.currentUser;
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      console.error(
        "[Aprendiz Bay] Falha ao solicitar e-mail:",
        payload?.error || response.status,
      );
    }
  } catch (error) {
    console.error("[Aprendiz Bay] Falha ao solicitar e-mail:", error);
  }
}
