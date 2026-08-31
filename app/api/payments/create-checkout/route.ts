import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { createBookingCheckout } from "@/lib/payments/create-checkout";
import {
  digitsOnly,
  isValidCpf,
  isValidPhone,
  isValidPostalCode,
} from "@/lib/payments/cpf";

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
    const body = (await request.json()) as {
      bookingId?: string;
      cpf?: string;
      email?: string;
      phone?: string;
      address?: string;
      addressNumber?: string;
      postalCode?: string;
      province?: string;
      price?: unknown;
      platformFee?: unknown;
      tutorAmount?: unknown;
    };
    const bookingId = body.bookingId?.trim();
    const cpf = digitsOnly(body.cpf ?? "");
    const phone = digitsOnly(body.phone ?? "");
    const postalCode = digitsOnly(body.postalCode ?? "");
    const address = body.address?.trim() ?? "";
    const addressNumber = body.addressNumber?.trim() ?? "";
    const province = body.province?.trim() ?? "";

    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    if (!address || !addressNumber || !province || !isValidPostalCode(postalCode)) {
      return NextResponse.json(
        { error: "Informe endereço, número, bairro e CEP válidos." },
        { status: 400 },
      );
    }

    const profile = await getUserProfile(uid);
    const email = body.email?.trim() || profile?.email || "";
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const result = await createBookingCheckout({
      uid,
      bookingId,
      siteUrl: getSiteUrl(request),
      customer: {
        name: profile?.displayName?.trim() || "Aluno Aprendiz Bay",
        cpfCnpj: cpf,
        email,
        phone,
        address,
        addressNumber,
        postalCode,
        province,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      checkoutId: result.checkoutId,
      checkoutUrl: result.checkoutUrl,
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
    if (status >= 500) {
      captureServerException(error);
    }

    const publicMessage =
      status === 503
        ? "A configuração de pagamento não está disponível."
        : status === 400 && !/[áàâãéêíóôõúç]/i.test(message)
          ? "Não foi possível criar o checkout."
          : message;

    return NextResponse.json({ error: publicMessage }, { status });
  }
}
