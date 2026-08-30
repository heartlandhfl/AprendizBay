"use client";

import { openCookiePreferences } from "@/lib/legal/cookie-consent";

export default function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className="text-sm text-muted-foreground transition-colors hover:text-primary-600"
    >
      Cookies
    </button>
  );
}
