"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { uploadUserAvatar } from "@/lib/storage/service";
import { IMAGE_ACCEPT } from "@/lib/storage/constants";
import { validateImageFile } from "@/lib/storage/validation";
import { updateTutorProfile } from "@/lib/tutors/service";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  tutorId?: string;
  onUploaded?: (url: string) => void;
  label?: string;
  description?: string;
}

export default function AvatarUpload({
  userId,
  currentUrl,
  tutorId,
  onUploaded,
  label = "Foto de perfil",
  description = "Envie uma foto nítida do seu rosto. Máximo de 5 MB (JPG, PNG, WebP ou GIF).",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const downloadUrl = await uploadUserAvatar(userId, file);

      if (tutorId) {
        await updateTutorProfile(tutorId, { avatarUrl: downloadUrl });
      }

      setPreviewUrl(downloadUrl);
      setSuccess("Foto enviada com sucesso.");
      onUploaded?.(downloadUrl);
    } catch {
      setPreviewUrl(currentUrl ?? null);
      setError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
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

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-muted ring-4 ring-primary-100">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Pré-visualização da foto de perfil"
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" aria-hidden="true" />
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
            disabled={uploading}
            aria-label={label}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {uploading ? "Enviando..." : "Escolher foto"}
          </button>
        </div>
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
