import type { AppLocale } from "./types";

export type LocaleOption = {
  value: AppLocale;
  label: string;
  flagCode?: "jp" | "kr" | "tw";
  flagEmoji?: string;
};

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { value: "ja", label: "日本語", flagCode: "jp" },
  { value: "ko", label: "한국어", flagCode: "kr" },
  { value: "zh-TW", label: "繁體中文", flagCode: "tw" },
  { value: "en", label: "English", flagEmoji: "🇺🇸" },
];

export function getLocaleOption(locale: AppLocale): LocaleOption {
  return LOCALE_OPTIONS.find((option) => option.value === locale)!;
}
