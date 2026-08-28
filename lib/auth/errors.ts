const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/invalid-email": "Informe um e-mail válido.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
  "auth/account-exists-with-different-credential":
    "Já existe uma conta com este e-mail usando outro método de login.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return FIREBASE_AUTH_MESSAGES[error.code] ?? "Não foi possível concluir a operação.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}
