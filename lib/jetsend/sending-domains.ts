import { JETSEND_SENDING_DOMAIN_PATH } from "@/lib/jetsend/config";
import { jetsendRequest } from "@/lib/jetsend/client";

export interface JetSendDnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: string;
}

export interface JetSendSendingDomain {
  domain: string;
  status?: string;
  verified?: boolean;
  dnsRecords: JetSendDnsRecord[];
  raw: unknown;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDnsRecord(record: unknown): JetSendDnsRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const entry = record as Record<string, unknown>;
  const type = readString(entry.type) ?? readString(entry.record_type);
  const name =
    readString(entry.name) ??
    readString(entry.host) ??
    readString(entry.hostname) ??
    readString(entry.key);
  const value =
    readString(entry.value) ??
    readString(entry.data) ??
    readString(entry.target) ??
    readString(entry.content);
  const priority = readString(entry.priority);

  if (!type || !name || !value) {
    return null;
  }

  return { type, name, value, ...(priority ? { priority } : {}) };
}

function extractDnsRecords(body: unknown): JetSendDnsRecord[] {
  if (!body || typeof body !== "object") {
    return [];
  }

  const root = body as Record<string, unknown>;
  const candidates = [
    root.dns_records,
    root.dnsRecords,
    root.records,
    root.dns,
    root.verification_records,
    (root.data as Record<string, unknown> | undefined)?.dns_records,
    (root.results as Record<string, unknown> | undefined)?.dns_records,
    (root.sending_domain as Record<string, unknown> | undefined)?.dns_records,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const normalized = candidate
      .map((record) => normalizeDnsRecord(record))
      .filter((record): record is JetSendDnsRecord => record !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

export function normalizeSendingDomainResponse(
  body: unknown,
  fallbackDomain?: string,
): JetSendSendingDomain {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested =
    root.sending_domain && typeof root.sending_domain === "object"
      ? (root.sending_domain as Record<string, unknown>)
      : root;

  const domain =
    readString(nested.domain) ??
    readString(nested.name) ??
    readString(root.domain) ??
    fallbackDomain ??
    "";

  const status = readString(nested.status) ?? readString(root.status);
  const verified =
    typeof nested.verified === "boolean"
      ? nested.verified
      : typeof root.verified === "boolean"
        ? root.verified
        : status?.toLowerCase() === "verified";

  return {
    domain,
    status,
    verified,
    dnsRecords: extractDnsRecords(body),
    raw: body,
  };
}

export function normalizeDomainInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function validateSendingDomainInput(value: string): string | null {
  const domain = normalizeDomainInput(value);
  if (!domain) {
    return "Informe o domínio de envio.";
  }
  if (!DOMAIN_PATTERN.test(domain)) {
    return "Informe um domínio válido, por exemplo aprendizbay.com.br.";
  }
  return null;
}

export async function createSendingDomain(domainInput: string): Promise<JetSendSendingDomain> {
  const validationError = validateSendingDomainInput(domainInput);
  if (validationError) {
    throw new Error(validationError);
  }

  const domain = normalizeDomainInput(domainInput);
  const response = await jetsendRequest({
    path: JETSEND_SENDING_DOMAIN_PATH,
    method: "POST",
    body: { domain },
  });

  return normalizeSendingDomainResponse(response, domain);
}

export async function listSendingDomains(): Promise<JetSendSendingDomain[]> {
  const response = await jetsendRequest({
    path: JETSEND_SENDING_DOMAIN_PATH,
    method: "GET",
  });

  if (Array.isArray(response)) {
    return response.map((entry) => normalizeSendingDomainResponse(entry));
  }

  if (response && typeof response === "object") {
    const root = response as Record<string, unknown>;
    const collection = root.sending_domains ?? root.domains ?? root.results ?? root.data;
    if (Array.isArray(collection)) {
      return collection.map((entry) => normalizeSendingDomainResponse(entry));
    }

    if (root.domain || root.sending_domain) {
      return [normalizeSendingDomainResponse(response)];
    }
  }

  return [];
}
