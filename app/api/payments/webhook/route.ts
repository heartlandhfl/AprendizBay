import { NextResponse } from "next/server";
import { confirmBookingWithMeetingUrl, getBookingById } from "@/lib/bookings/server";
import { isAuthorizedAsaasWebhook, parseAsaasWebhook } from "@/lib/payments/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAsaasWebhook(request.headers)) {
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });
    }

    const payload: unknown = await request.json();
    const event = parseAsaasWebhook(payload);

    if (!event.isSuccessfulPayment) {
      return NextResponse.json({ received: true, ignored: event.event || "unknown" });
    }

    if (!event.bookingId) {
      return NextResponse.json({ received: true, ignored: "missing_external_reference" });
    }

    const booking = await getBookingById(event.bookingId);
    if (!booking) {
      return NextResponse.json({ received: true, ignored: "booking_not_found" });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ received: true, ignored: "cancelled" });
    }

    await confirmBookingWithMeetingUrl(event.bookingId, {
      paymentId: event.paymentId,
      asaasCheckoutId: event.asaasCheckoutId,
    });

    return NextResponse.json({
      received: true,
      bookingId: event.bookingId,
      confirmed: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o webhook.";
    const status = message.includes("Firebase Admin") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
