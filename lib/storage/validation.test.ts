import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "@/lib/storage/constants";
import {
  sanitizeCredentialFileName,
  validateDocumentFile,
  validateImageFile,
} from "@/lib/storage/validation";

function fakeFile(name: string, type: string, size: number): File {
  const bytes = new Uint8Array(Math.min(size, 16));
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("accepts a JPEG under 5 MB", () => {
    expect(validateImageFile(fakeFile("foto.jpg", "image/jpeg", 1024))).toBeNull();
  });

  it("rejects SVG and other scriptable types", () => {
    expect(validateImageFile(fakeFile("foto.svg", "image/svg+xml", 1024))).toBe(
      "Use uma imagem JPG, PNG, WebP ou GIF.",
    );
  });

  it("rejects images that are 5 MB or larger", () => {
    expect(validateImageFile(fakeFile("foto.jpg", "image/jpeg", MAX_IMAGE_BYTES))).toBe(
      "A imagem deve ter menos de 5 MB.",
    );
  });
});

describe("validateDocumentFile", () => {
  it("accepts PDF, JPEG, and PNG under 10 MB", () => {
    expect(validateDocumentFile(fakeFile("doc.pdf", "application/pdf", 2048))).toBeNull();
    expect(validateDocumentFile(fakeFile("doc.jpg", "image/jpeg", 2048))).toBeNull();
    expect(validateDocumentFile(fakeFile("doc.png", "image/png", 2048))).toBeNull();
  });

  it("rejects WebP, GIF, SVG, and executables", () => {
    const message = "Use um arquivo PDF, JPG ou PNG.";
    expect(validateDocumentFile(fakeFile("doc.webp", "image/webp", 2048))).toBe(message);
    expect(validateDocumentFile(fakeFile("doc.gif", "image/gif", 2048))).toBe(message);
    expect(validateDocumentFile(fakeFile("doc.svg", "image/svg+xml", 2048))).toBe(message);
    expect(validateDocumentFile(fakeFile("doc.js", "application/javascript", 2048))).toBe(message);
    expect(validateDocumentFile(fakeFile("doc.html", "text/html", 2048))).toBe(message);
  });

  it("rejects documents that are 10 MB or larger", () => {
    expect(validateDocumentFile(fakeFile("doc.pdf", "application/pdf", MAX_DOCUMENT_BYTES))).toBe(
      "O documento deve ter menos de 10 MB.",
    );
  });
});

describe("sanitizeCredentialFileName", () => {
  it("uses a safe timestamped name with an allowlisted extension", () => {
    const name = sanitizeCredentialFileName(fakeFile("RG Digital.PDF", "application/pdf", 100));
    expect(name).toMatch(/^documento-\d+\.pdf$/);
  });

  it("maps JPEG and PNG to safe extensions", () => {
    expect(sanitizeCredentialFileName(fakeFile("cnh.jpeg", "image/jpeg", 100))).toMatch(
      /^documento-\d+\.jpg$/,
    );
    expect(sanitizeCredentialFileName(fakeFile("diploma.png", "image/png", 100))).toMatch(
      /^documento-\d+\.png$/,
    );
  });

  it("rejects unknown types instead of copying a dangerous extension", () => {
    expect(() => sanitizeCredentialFileName(fakeFile("payload.svg", "image/svg+xml", 100))).toThrow(
      "Use um arquivo PDF, JPG ou PNG.",
    );
  });
});
