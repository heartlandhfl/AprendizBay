export const DEFAULT_PLATFORM_FEE_PERCENT = 10;

export interface BookingFeeSplit {
  platformFee: number;
  tutorAmount: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parsePlatformFeePercent(value: unknown): number {
  if (value == null || value === "") {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  return parsed;
}

export function getPlatformFeePercent(): number {
  return parsePlatformFeePercent(
    process.env.PLATFORM_FEE_PERCENT ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT,
  );
}

export function splitBookingPrice(
  price: number,
  percent: number = getPlatformFeePercent(),
): BookingFeeSplit {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  const safePercent = parsePlatformFeePercent(percent);
  const platformFee = roundMoney((safePrice * safePercent) / 100);
  const tutorAmount = roundMoney(safePrice - platformFee);
  return { platformFee, tutorAmount };
}

export function resolveBookingFeeSplit(booking: {
  price: number;
  platformFee?: number;
  tutorAmount?: number;
}): BookingFeeSplit {
  if (
    typeof booking.platformFee === "number" &&
    Number.isFinite(booking.platformFee) &&
    typeof booking.tutorAmount === "number" &&
    Number.isFinite(booking.tutorAmount)
  ) {
    return {
      platformFee: booking.platformFee,
      tutorAmount: booking.tutorAmount,
    };
  }

  return splitBookingPrice(booking.price);
}

let cachedPlatformFeePercent: number | null = null;

export async function loadPlatformFeePercent(): Promise<number> {
  if (cachedPlatformFeePercent != null) {
    return cachedPlatformFeePercent;
  }

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/public-config");
      if (response.ok) {
        const data = (await response.json()) as { platformFeePercent?: unknown };
        if (data.platformFeePercent != null && data.platformFeePercent !== "") {
          cachedPlatformFeePercent = parsePlatformFeePercent(data.platformFeePercent);
          return cachedPlatformFeePercent;
        }
      }
    } catch {
      // Fall back to baked env below.
    }
  }

  cachedPlatformFeePercent = getPlatformFeePercent();
  return cachedPlatformFeePercent;
}
