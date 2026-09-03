import { NextResponse } from "next/server";

import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { JetSendApiError } from "@/lib/jetsend/client";
import {
  createSendingDomain,
  listSendingDomains,
  validateSendingDomainInput,
} from "@/lib/jetsend/sending-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function mapJetSendError(error: unknown): { status: number; message: string } {
  if (error instanceof JetSendApiError) {
    if (error.details.code === "missing_api_key") {
      return {
        status: 503,
        message:
          "JetSend não está configurado no servidor. Defina JET_SEND_API_KEY nas variáveis de ambiente.",
      };
    }

    if (error.details.status === 401) {
      return {
        status: 502,
        message:
          "JetSend recusou a autenticação. Verifique se JET_SEND_API_KEY está correto no servidor.",
      };
    }

    return {
      status: error.details.status >= 400 && error.details.status < 600 ? error.details.status : 502,
      message: "Não foi possível consultar o JetSend. Tente novamente em instantes.",
    };
  }

  if (error instanceof Error) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: "Não foi possível consultar o JetSend." };
}

export async function GET(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    const domains = await listSendingDomains();
    return NextResponse.json({ ok: true, domains });
  } catch (error) {
    const mapped = mapJetSendError(error);
    if (!(error instanceof JetSendApiError) && error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: statusFromAdminError(error) },
      );
    }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const domain =
      body && typeof body === "object" && "domain" in body
        ? String((body as { domain?: unknown }).domain ?? "")
        : "";

    const validationError = validateSendingDomainInput(domain);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const created = await createSendingDomain(domain);
    return NextResponse.json({ ok: true, domain: created });
  } catch (error) {
    const mapped = mapJetSendError(error);
    if (!(error instanceof JetSendApiError) && error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: statusFromAdminError(error) },
      );
    }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
