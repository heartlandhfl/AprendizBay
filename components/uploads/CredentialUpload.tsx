"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { DOCUMENT_ACCEPT } from "@/lib/storage/constants";
import {
  getTutorCredentialDownloadUrl,
  uploadTutorCredential,
} from "@/lib/storage/service";
import { validateDocumentFile } from "@/lib/storage/validation";
import { updateTutorProfile } from "@/lib/tutors/service";

interface CredentialUploadProps {
  tutorId: string;
  currentFileName?: string | null;
  onUploaded?: (fileName: string) => void;
  label?: string;
  description?: string;
  persistToFirestore?: boolean;
}

export default function CredentialUpload({
  tutorId,
  currentFileName,
  onUploaded,
  label = "Documento de verificação",
  description = "Envie RG, CNH ou diploma para verificação. Visível apenas para você e administradores. Máximo de 10 MB (imagem ou PDF).",
  persistToFirestore = true,
}: CredentialUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(currentFileName ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFileName(currentFileName ?? null);
  }, [currentFileName]);

  useEffect(() => {
    if (!fileName) {
      setPreviewUrl(null);
      setIsPdf(false);
      return;
    }

    let cancelled = false;

    void getTutorCredentialDownloadUrl(tutorId, fileName)
      .then((url) => {
        if (cancelled) {
          return;
        }

        const pdf = fileName.toLowerCase().endsWith(".pdf");
        setIsPdf(pdf);
        setPreviewUrl(pdf ? null : url);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileName, tutorId]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateDocumentFile(file);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    const localPreview =
      file.type === "application/pdf" ? null : URL.createObjectURL(file);
    setIsPdf(file.type === "application/pdf");
    setPreviewUrl(localPreview);

    try {
      const { fileName: uploadedName, downloadUrl } = await uploadTutorCredential(
        tutorId,
        file,
      );

      if (persistToFirestore) {
        await updateTutorProfile(tutorId, { credentialFileName: uploadedName });
      }

      setFileName(uploadedName);
      setPreviewUrl(file.type === "application/pdf" ? null : downloadUrl);
      setSuccess("Documento enviado com sucesso.");
      onUploaded?.(uploadedName);
    } catch {
      setPreviewUrl(null);
      setFileName(currentFileName ?? null);
      setError("Não foi possível enviar o documento. Tente novamente.");
    } finally {
      setUploading(false);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        {fileName && (
          <div className="mb-4 space-y-3">
            {previewUrl && !isPdf ? (
              <Image
                src={previewUrl}
                alt="Pré-visualização do documento de verificação"
                width={400}
                height={192}
                unoptimized
                className="max-h-48 rounded-xl border border-border object-contain"
              />
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-border/60">
                <FileText className="h-8 w-8 shrink-0 text-primary-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Documento enviado</p>
                  <p className="truncate text-xs text-muted-foreground">{fileName}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
          disabled={uploading}
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {fileName ? "Substituir documento" : "Enviar documento"}
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">
          {success}
        </p>
      )}
    </div>
  );
}
