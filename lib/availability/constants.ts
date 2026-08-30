import type { Weekday } from "@/lib/availability/types";

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const AVAILABILITY_DOC_ID = "weekly";
