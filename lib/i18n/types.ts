// lib/i18n/types.ts

export type AppLocale = "ja" | "en";

export const DEFAULT_LOCALE: AppLocale = "ja";

export function normalizeLocale(input?: string | null): AppLocale {
  return input?.toLowerCase().startsWith("en") ? "en" : DEFAULT_LOCALE;
}
