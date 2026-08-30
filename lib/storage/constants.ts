export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const DOCUMENT_ACCEPT = `${IMAGE_ACCEPT},application/pdf`;

export const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const DOCUMENT_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  "application/pdf",
]);
