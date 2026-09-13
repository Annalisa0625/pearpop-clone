// lib/i18n/types.ts

export const APP_LOCALES = ["ja", "en", "ko", "zh-TW"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ja";

export function normalizeLocale(input?: string | null): AppLocale {
  const value = input?.trim().toLowerCase();
  if (!value) return DEFAULT_LOCALE;

  if (value === "ja" || value === "ja-jp") return "ja";
  if (value === "en" || value === "en-us" || value === "en-gb") return "en";
  if (value === "ko" || value === "ko-kr") return "ko";
  if (
    value === "zh-tw" ||
    value === "zh-hant" ||
    value === "zh-hant-tw"
  ) {
    return "zh-TW";
  }

  return DEFAULT_LOCALE;
}
