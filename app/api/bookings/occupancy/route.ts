import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import {
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
} from "@/lib/bookings/occupancy";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel / next start counterpart to GET /api/bookings/occupancy
 * (server/api/bookings.js on Hostinger Express). Returns occupied slot
 * start times only so the public picker never reads booking documents.
 */
export async function GET(request: Request) {
  const tutorId = normalizeTutorId(new URL(request.url).searchParams.get("tutorId"));
  if (!tutorId) {
    return NextResponse.json(
      { error: "Informe o identificador do professor." },
      { status: 400 },
    );
  }

  try {
    const occupiedStarts = await loadTutorOccupiedStarts(
      getFirestore(getAdminApp()),
      tutorId,
    );
    return NextResponse.json(occupancyResponse(occupiedStarts));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível verificar horários já reservados.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "A verificação de horários não está disponível no momento."
            : "Não foi possível verificar horários já reservados.",
      },
      { status },
    );
  }
}
