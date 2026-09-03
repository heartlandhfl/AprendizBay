import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";

import { statusFromAdminError } from "@/lib/admin/authorize";
import {
  CONTACT_INBOX_STATUS_OPTIONS,
  getAdminContactInboxMessage,
  updateAdminContactInboxMessage,
} from "@/lib/admin/contact-inbox";
import type { ContactInboxStatus } from "@/lib/contact/types";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function readUpdateInput(body: unknown): {
  status?: ContactInboxStatus;
  assignedTo?: string | null;
} {
  if (!body || typeof body !== "object") {
    return {};
  }

  const record = body as Record<string, unknown>;
  const status = record.status;
  const assignedTo = record.assignedTo;

  const update: {
    status?: ContactInboxStatus;
    assignedTo?: string | null;
  } = {};

  if (typeof status === "string" && CONTACT_INBOX_STATUS_OPTIONS.includes(status as ContactInboxStatus)) {
    update.status = status as ContactInboxStatus;
  }

  if (assignedTo === null) {
    update.assignedTo = null;
  } else if (typeof assignedTo === "string") {
    update.assignedTo = assignedTo.trim() || null;
  }

  return update;
}

export async function GET(
  _request: Request,
  context: { params: { messageId: string } },
) {
  try {
    await verifyAdminIdToken(readBearerToken(_request));
    const message = await getAdminContactInboxMessage(
      getFirestore(getAdminApp()),
      context.params.messageId,
    );

    if (!message) {
      return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar a mensagem.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}

export async function PATCH(
  request: Request,
  context: { params: { messageId: string } },
) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const update = readUpdateInput(body);
    if (!update.status && update.assignedTo === undefined) {
      return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
    }

    const message = await updateAdminContactInboxMessage(
      getFirestore(getAdminApp()),
      context.params.messageId,
      update,
    );

    if (!message) {
      return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar a mensagem.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
