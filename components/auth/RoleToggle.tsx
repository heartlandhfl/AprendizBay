"use client";

import type { SignupRole } from "@/lib/auth/types";

interface RoleToggleProps {
  value: SignupRole;
  onChange: (role: SignupRole) => void;
}

export default function RoleToggle({ value, onChange }: RoleToggleProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1"
      role="group"
      aria-label="Tipo de conta"
    >
      <button
        type="button"
        onClick={() => onChange("student")}
        className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
          value === "student"
            ? "bg-surface text-primary-700 shadow-card"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={value === "student"}
      >
        Quero aprender
      </button>
      <button
        type="button"
        onClick={() => onChange("tutor")}
        className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
          value === "tutor"
            ? "bg-surface text-primary-700 shadow-card"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={value === "tutor"}
      >
        Quero ensinar
      </button>
    </div>
  );
}
