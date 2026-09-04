const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/invalid-email": "Informe um e-mail válido.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.",
  "auth/cancelled-popup-request": "Aguarde o login com Google terminar antes de tentar de novo.",
  "auth/account-exists-with-different-credential":
    "Já existe uma conta com este e-mail usando outro método de login.",
};

const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "Não foi possível salvar seu cadastro. Saia da conta, entre novamente e tente outra vez.",
  unavailable: "Serviço temporariamente indisponível. Tente novamente em instantes.",
  "already-exists": "Conta já existente. Faça login para continuar.",
  "failed-precondition": "Não foi possível concluir o cadastro neste momento. Tente novamente.",
};

function resolveErrorCode(code: string): string | undefined {
  if (FIREBASE_AUTH_MESSAGES[code]) {
    return FIREBASE_AUTH_MESSAGES[code];
  }

  if (FIRESTORE_ERROR_MESSAGES[code]) {
    return FIRESTORE_ERROR_MESSAGES[code];
  }

  const shortCode = code.includes("/") ? code.split("/").pop()! : code;
  return FIRESTORE_ERROR_MESSAGES[shortCode] ?? FIREBASE_AUTH_MESSAGES[shortCode];
}

export function getAuthErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return resolveErrorCode(error.code) ?? "Não foi possível concluir a operação.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}
