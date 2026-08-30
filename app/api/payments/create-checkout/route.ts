import { NextResponse } from "next/server";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { getBookingById, saveBookingCheckoutId } from "@/lib/bookings/server";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import { createAsaasCheckout } from "@/lib/payments/asaas";
import { digitsOnly, isValidCpf } from "@/lib/payments/cpf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function getSiteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as { bookingId?: string; cpf?: string };
    const bookingId = body.bookingId?.trim();
    const cpf = digitsOnly(body.cpf ?? "");

    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });
    }

    const [booking, profile] = await Promise.all([
      getBookingById(bookingId),
      getUserProfile(uid),
    ]);

    if (!booking) {
      return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
    }

    if (booking.studentId !== uid) {
      return NextResponse.json(
        { error: "Você só pode pagar as suas próprias reservas." },
        { status: 403 },
      );
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Esta reserva não está disponível para pagamento." },
        { status: 409 },
      );
    }

    if (booking.paymentStatus !== "awaiting_payment") {
      return NextResponse.json(
        { error: "Aguarde o professor confirmar a aula antes de pagar." },
        { status: 409 },
      );
    }

    if (!Number.isFinite(booking.price) || booking.price <= 0) {
      return NextResponse.json({ error: "O valor da reserva é inválido." }, { status: 400 });
    }

    const siteUrl = getSiteUrl(request);
    const typeLabel = BOOKING_TYPE_LABELS[booking.type] ?? "Aula";
    const checkout = await createAsaasCheckout({
      bookingId: booking.id,
      itemName: `Aula ${typeLabel}`.slice(0, 30),
      itemDescription: `Pagamento da aula ${typeLabel.toLowerCase()} no Aprendiz Bay`,
      value: booking.price,
      customer: {
        name: profile?.displayName?.trim() || "Aluno Aprendiz Bay",
        cpfCnpj: cpf,
        email: profile?.email,
      },
      successUrl: `${siteUrl}/bookings?pagamento=sucesso`,
      cancelUrl: `${siteUrl}/bookings?pagamento=cancelado`,
      expiredUrl: `${siteUrl}/bookings?pagamento=expirado`,
    });

    await saveBookingCheckoutId(booking.id, checkout.id);

    return NextResponse.json({
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkoutUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o checkout.";
    const status =
      message.includes("Token") || message.includes("autenticação")
        ? 401
        : message.includes("ASAAS_API_KEY") || message.includes("Firebase Admin")
          ? 503
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
