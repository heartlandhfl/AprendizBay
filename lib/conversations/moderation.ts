import type { OffPlatformSignal } from "@/lib/conversations/types";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PIX_EVP_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const PIX_RANDOM_RE = /\b[0-9a-f]{32}\b/i;
const BR_PHONE_RE =
  /(?:\+55\s*)?(?:\(?\d{2}\)?\s*)(?:9\d{4}[-\s.]?\d{4}|[2-5]\d{3}[-\s.]?\d{4})/;
const BR_PHONE_COMPACT_RE = /\b(?:\+?55)?\s*\d{2}9\d{8}\b/;

const PAYMENT_INSTRUCTION_RE =
  /\b(chave\s+pix|meu\s+pix|pix\s*[:\-]|chave\s+aleatoria|paypal|picpay|transferencia\s+bancaria|ted\b|doc\s+bancario|paga(?:r|mento)?\s+(?:por|no|via|fora)|fora da plataforma|deposita(?:r)?\s+na\s+conta)\b/i;

const EXTERNAL_CONTACT_RE =
  /\b(whats\s*app|whatsapp|\bwpp\b|\bzap\b|telegram|instagram|me\s+chama\s+no|s[oó]\s+no\s+zap)\b/i;

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function stripBenignNumericContext(text: string): string {
  return text
    .replace(/\b([01]?\d|2[0-3])[:hH][0-5]\d(?:\s*h)?\b/g, " ")
    .replace(/\b(?:[01]?\d|2[0-3])\s*h(?:oras?)?\b/gi, " ")
    .replace(/\br\$\s*\d+(?:[.,]\d{2})?\b/gi, " ")
    .replace(/\b\d+(?:[.,]\d{2})?\s*(?:reais?|alunos?|vagas?|aulas?|min(?:utos)?|anos?)\b/gi, " ")
    .replace(/\b(?:cep)\s*\d{5}-?\d{3}\b/gi, " ");
}

function hasPhoneNumber(text: string): boolean {
  const candidates = stripBenignNumericContext(text);
  return BR_PHONE_RE.test(candidates) || BR_PHONE_COMPACT_RE.test(candidates);
}

function hasPixKey(text: string, normalized: string): boolean {
  if (PIX_EVP_RE.test(text) || PIX_RANDOM_RE.test(text)) {
    return true;
  }

  return /\b(chave\s+pix|meu\s+pix|pix\s*[:\-]|chave\s+aleatoria)\b/i.test(normalized);
}

export function detectOffPlatformSignals(text: string): OffPlatformSignal[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const normalized = stripDiacritics(trimmed).toLowerCase();
  const signals = new Set<OffPlatformSignal>();

  if (EMAIL_RE.test(trimmed)) {
    signals.add("email");
  }

  if (hasPhoneNumber(trimmed)) {
    signals.add("phone");
  }

  if (hasPixKey(trimmed, normalized)) {
    signals.add("pix_key");
  }

  if (PAYMENT_INSTRUCTION_RE.test(normalized)) {
    signals.add("payment_instruction");
  }

  if (EXTERNAL_CONTACT_RE.test(normalized)) {
    signals.add("external_contact");
  }

  return [...signals];
}

export function describeOffPlatformWarning(signals: OffPlatformSignal[]): string {
  if (signals.length === 0) {
    return "";
  }

  return [
    "Esta mensagem parece tentar levar o combinado ou o pagamento para fora da Aprendiz Bay.",
    "Mantenha o contato e o pagamento na plataforma para a sua segurança.",
    "Horários, preços e outras quantidades sozinhas não são um problema.",
  ].join(" ");
}
