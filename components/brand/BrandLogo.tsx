import Image from "next/image";
import Link from "next/link";

const LOGO_WIDTH = 1053;
const LOGO_HEIGHT = 798;

type BrandLogoProps = {
  height?: number;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  height = 44,
  className = "",
  priority = false,
}: BrandLogoProps) {
  const width = Math.round((LOGO_WIDTH / LOGO_HEIGHT) * height);

  return (
    <Image
      src="/logo.png"
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
}: BrandLogoLinkProps) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      <BrandLogo height={height} className={className} priority={priority} />
    </Link>
  );
}
