import type { Modality } from "@/lib/mock-tutors";

export function formatTutorPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function modalityLabel(modality: Modality): string {
  switch (modality) {
    case "online":
      return "Online";
    case "presencial":
      return "Presencial";
    case "ambos":
      return "Online e presencial";
    default:
      return modality;
  }
}

export function formatTutorRating(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatReviewCountLabel(count: number): string {
  return count === 1 ? "1 avaliação" : `${count.toLocaleString("pt-BR")} avaliações`;
}

export function formatLocation(city?: string, state?: string): string | undefined {
  const cityName = city?.trim();
  const stateName = state?.trim();

  if (cityName && stateName) {
    return `${cityName}, ${stateName}`;
  }

  return cityName || stateName || undefined;
}

export function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}
