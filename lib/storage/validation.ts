import {
  DOCUMENT_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/storage/constants";

export function validateImageFile(file: File): string | null {
  if (!IMAGE_CONTENT_TYPES.has(file.type)) {
    return "Use uma imagem JPG, PNG, WebP ou GIF.";
  }

  if (file.size >= MAX_IMAGE_BYTES) {
    return "A imagem deve ter menos de 5 MB.";
  }

  return null;
}

export function validateDocumentFile(file: File): string | null {
  if (!DOCUMENT_CONTENT_TYPES.has(file.type)) {
    return "Use uma imagem (JPG, PNG, WebP, GIF) ou PDF.";
  }

  if (file.size >= MAX_DOCUMENT_BYTES) {
    return "O documento deve ter menos de 10 MB.";
  }

  return null;
}

export function sanitizeCredentialFileName(file: File): string {
  const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] ?? "bin";
  const timestamp = Date.now();
  return `documento-${timestamp}.${extension}`;
}
