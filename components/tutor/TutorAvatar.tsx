import Image from "next/image";
import { tutorInitials } from "@/lib/tutors/strings";

const SIZE_CLASS = {
  sm: "h-16 w-16 text-lg",
  md: "h-24 w-24 text-2xl",
  lg: "h-32 w-32 text-3xl sm:h-40 sm:w-40",
} as const;

const PIXEL_SIZE = {
  sm: 64,
  md: 96,
  lg: 160,
} as const;

interface TutorAvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof SIZE_CLASS;
  online?: boolean;
  className?: string;
}

export default function TutorAvatar({
  name,
  src,
  size = "lg",
  online = false,
  className = "",
}: TutorAvatarProps) {
  const photo = src?.trim();
  const initials = tutorInitials(name);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`relative overflow-hidden rounded-full bg-primary-50 text-primary-800 ring-4 ring-primary-100 ${SIZE_CLASS[size]}`}
      >
        {photo ? (
          <Image
            src={photo}
            alt={`Foto de perfil de ${name}`}
            width={PIXEL_SIZE[size]}
            height={PIXEL_SIZE[size]}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-bold"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-4 border-surface bg-primary-500 sm:bottom-2 sm:right-2 sm:h-5 sm:w-5"
          title="Online agora"
          aria-label="Online agora"
        />
      )}
    </div>
  );
}
