import Image from "next/image";
import Link from "next/link";

const LOGOS = {
  full: { src: "/logo.png", width: 1672, height: 941 },
  compact: { src: "/logo-nav.png", width: 1672, height: 778 },
} as const;

type LogoVariant = keyof typeof LOGOS;

type BrandLogoProps = {
  height?: number;
  className?: string;
  priority?: boolean;
  variant?: LogoVariant;
};

export default function BrandLogo({
  height = 44,
  className = "",
  priority = false,
  variant = "full",
}: BrandLogoProps) {
  const { src, width: logoWidth, height: logoHeight } = LOGOS[variant];
  const width = Math.round((logoWidth / logoHeight) * height);

  return (
    <Image
      src={src}
      alt="AprendizBay"
      width={width}
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height, width }}
      priority={priority}
    />
  );
}

type BrandLogoLinkProps = BrandLogoProps & {
  href?: string;
};

export function BrandLogoLink({
  href = "/",
  height = 44,
  className = "",
  priority = false,
  variant = "full",
}: BrandLogoLinkProps) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      <BrandLogo
        height={height}
        className={className}
        priority={priority}
        variant={variant}
      />
    </Link>
  );
}
