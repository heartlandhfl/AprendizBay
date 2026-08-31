import {
  CREDENTIAL_EXTENSION_BY_TYPE,
  DOCUMENT_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/storage/constants";

export function validateImageFile(file: File): string | null {
  if (!IMAGE_CONTENT_TYPES.has(file.type)) {
    return "Use uma imagem JPG, PNG, WebP ou GIF.";
  }

  if (file.size <= 0 || file.size >= MAX_IMAGE_BYTES) {
    return "A imagem deve ter menos de 5 MB.";
  }

  return null;
}

export function validateDocumentFile(file: File): string | null {
  if (!DOCUMENT_CONTENT_TYPES.has(file.type)) {
    return "Use um arquivo PDF, JPG ou PNG.";
  }

  if (file.size <= 0 || file.size >= MAX_DOCUMENT_BYTES) {
    return "O documento deve ter menos de 10 MB.";
  }

  return null;
}

export function sanitizeCredentialFileName(file: File): string {
  const extension = CREDENTIAL_EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    throw new Error("Use um arquivo PDF, JPG ou PNG.");
  }

  return `documento-${Date.now()}.${extension}`;
}
