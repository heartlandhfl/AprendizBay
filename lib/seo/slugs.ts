/**
 * Portuguese-friendly URL slugs: "Inglês" → "ingles", "São Paulo" → "sao-paulo".
 */
export function toSeoSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugsMatch(value: string, slug: string): boolean {
  return toSeoSlug(value) === toSeoSlug(slug);
}

export function findLabelBySlug(labels: Iterable<string>, slug: string): string | undefined {
  for (const label of labels) {
    if (slugsMatch(label, slug)) {
      return label;
    }
  }
  return undefined;
}
