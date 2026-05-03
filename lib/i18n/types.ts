// lib/i18n/types.ts

export type AppLocale = "ja" | "en";

export const DEFAULT_LOCALE: AppLocale = "ja";

export function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;

  const lowered = input.toLowerCase();

  if (lowered.startsWith("ja")) return "ja";
  return "en";
}