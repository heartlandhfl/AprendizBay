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
