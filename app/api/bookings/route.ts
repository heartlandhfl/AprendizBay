import { NextResponse } from "next/server";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { statusFromCreateBookingError } from "@/lib/bookings/create-booking";
import { createIndividualBookingAsStudent } from "@/lib/bookings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/bookings
 * (server/api/bookings.js on Hostinger Express). Authoritative
 * individual-slot check runs in a Firestore transaction immediately
 * before the booking is committed.
 */
export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      tutorId?: string;
      type?: string;
      scheduledAt?: string;
      price?: number;
      platformFee?: number;
      tutorAmount?: number;
    };
    const profile = await getUserProfile(uid);

    const result = await createIndividualBookingAsStudent({
      actorUid: uid,
      actorRole: profile?.role,
      tutorId: body.tutorId,
      type: body.type,
      scheduledAt: body.scheduledAt,
      price: body.price,
      platformFee: body.platformFee,
      tutorAmount: body.tutorAmount,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar a reserva.";
    return NextResponse.json(
      {
        error: message,
        code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      },
      { status: statusFromCreateBookingError(error) },
    );
  }
}
