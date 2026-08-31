/**
 * Hardcoded volume claims that must not appear in public copy
 * unless they come from a live production count.
 */
export const UNSUPPORTED_VOLUME_CLAIM_PATTERNS: ReadonlyArray<{
  id: string;
  pattern: RegExp;
}> = [
  {
    id: "thousands-of-people-or-lessons",
    pattern:
      /\bmilhares de (?:professores|tutores|alunos|aulas|avaliações|transações)\b/i,
  },
  {
    id: "hundreds-of-people-or-lessons",
    pattern:
      /\bcentenas de (?:professores|tutores|alunos|aulas|avaliações|transações)\b/i,
  },
  {
    id: "millions-of-people-or-lessons",
    pattern:
      /\bmilh[oõ]es de (?:professores|tutores|alunos|aulas|avaliações|transações)\b/i,
  },
  {
    id: "more-than-n-people-or-lessons",
    pattern:
      /\bmais de \d+[\d.]*(?: alunos| professores| tutores| aulas| avaliações| transações)\b/i,
  },
  {
    id: "invented-savings-percent",
    pattern: /\beconomize até \d+%\b/i,
  },
];

export interface MarketingClaimMatch {
  id: string;
  match: string;
}

export function findUnsupportedVolumeClaims(text: string): MarketingClaimMatch[] {
  const matches: MarketingClaimMatch[] = [];

  for (const { id, pattern } of UNSUPPORTED_VOLUME_CLAIM_PATTERNS) {
    const found = text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));
    if (!found) {
      continue;
    }

    for (const match of found) {
      matches.push({ id, match });
    }
  }

  return matches;
}
