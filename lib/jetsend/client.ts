import {
  isJetSendConfigured,
  readJetSendApiKey,
  resolveJetSendApiUrl,
} from "@/lib/jetsend/config";

export interface JetSendApiErrorDetails {
  status: number;
  body: string;
  code: "missing_api_key" | "jetsend_api_error" | "jetsend_network_error";
}

export class JetSendApiError extends Error {
  readonly details: JetSendApiErrorDetails;

  constructor(message: string, details: JetSendApiErrorDetails) {
    super(message);
    this.name = "JetSendApiError";
    this.details = details;
  }
}

export interface JetSendRequestOptions {
  /** Relative API path under https://app.jetsend.com/api/v1 */
  path?: string;
  /** Optional absolute JetSend API URL (used for transmission overrides). */
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

function buildAuthorizationHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

export async function jetsendRequest<T = unknown>(options: JetSendRequestOptions): Promise<T> {
  const apiKey = readJetSendApiKey();
  if (!apiKey) {
    throw new JetSendApiError("JetSend API key is not configured on the server.", {
      status: 503,
      body: "",
      code: "missing_api_key",
    });
  }

  const url = options.url ?? resolveJetSendApiUrl(options.path ?? "/");
  const method = options.method ?? "GET";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        accept: "application/json",
        Authorization: buildAuthorizationHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network error while contacting JetSend.";
    throw new JetSendApiError(`JetSend unavailable: ${message}`, {
      status: 0,
      body: "",
      code: "jetsend_network_error",
    });
  }

  const body = await response.text();
  if (!response.ok) {
    throw new JetSendApiError(`JetSend API request failed (${response.status}).`, {
      status: response.status,
      body: body.slice(0, 400),
      code: "jetsend_api_error",
    });
  }

  if (!body.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new JetSendApiError("JetSend API returned an invalid JSON response.", {
      status: response.status,
      body: body.slice(0, 400),
      code: "jetsend_api_error",
    });
  }
}

export function getJetSendAuthHeaderForTests(): string | null {
  if (!isJetSendConfigured()) {
    return null;
  }
  return buildAuthorizationHeader(readJetSendApiKey());
}
