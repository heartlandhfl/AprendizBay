export type ConversationErrorCode =
  | "empty"
  | "oversized"
  | "rate_limited"
  | "blocked"
  | "already_reported"
  | "permission"
  | "unavailable";

export class ConversationError extends Error {
  readonly code: ConversationErrorCode;

  constructor(code: ConversationErrorCode, message: string) {
    super(message);
    this.name = "ConversationError";
    this.code = code;
  }
}

export function isConversationError(error: unknown): error is ConversationError {
  return error instanceof ConversationError;
}

export function conversationErrorMessage(error: unknown, fallback: string): string {
  if (isConversationError(error)) {
    return error.message;
  }

  return fallback;
}

export function isPermissionDenied(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      String((error as { code: unknown }).code).includes("permission-denied"),
  );
}
