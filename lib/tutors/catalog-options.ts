/**
 * Search filter labels used by production UI.
 * Keep this module free of fictional tutor records so client bundles
 * do not ship marketplace inventory fixtures.
 */
export const SUBJECTS = [
  "Todas as matérias",
  "Inglês",
  "Python",
  "Violão",
  "Matemática",
  "Espanhol",
] as const;

export const PRICE_RANGES = [
  { label: "Qualquer preço", min: 0, max: Infinity },
  { label: "Até R$ 30/h", min: 0, max: 30 },
  { label: "R$ 30 – R$ 60/h", min: 30, max: 60 },
  { label: "R$ 60 – R$ 90/h", min: 60, max: 90 },
  { label: "Acima de R$ 90/h", min: 90, max: Infinity },
] as const;
