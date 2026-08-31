"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { getTutorCredentialBlob } from "@/lib/storage/service";

interface CredentialDocumentPreviewProps {
  tutorId: string;
  fileName?: string;
}

export default function CredentialDocumentPreview({
  tutorId,
  fileName,
}: CredentialDocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(Boolean(fileName));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileName) {
      setPreviewUrl(null);
      setIsPdf(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);

    void getTutorCredentialBlob(tutorId, fileName)
      .then((blob) => {
        if (cancelled) {
          return;
        }

        const pdf = fileName.toLowerCase().endsWith(".pdf") || blob.type === "application/pdf";
        setIsPdf(pdf);
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível abrir o documento de verificação.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileName, tutorId]);

  if (!fileName) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando documento...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (previewUrl && !isPdf) {
    return (
      <Image
        src={previewUrl}
        alt="Documento de verificação do professor"
        width={400}
        height={192}
        unoptimized
        className="max-h-48 rounded-xl border border-border object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/60">
      <FileText className="h-8 w-8 shrink-0 text-primary-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Documento em PDF</p>
        <p className="truncate text-xs text-muted-foreground">{fileName}</p>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs font-medium text-primary-700 hover:text-primary-600"
          >
            Abrir documento
          </a>
        )}
      </div>
    </div>
  );
}
