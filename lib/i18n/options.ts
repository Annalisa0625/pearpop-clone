import type { AppLocale } from "./types";
import type { CreatorCountry } from "@/lib/creator/country";

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

const INITIAL_LOCALE_BY_CREATOR_COUNTRY: Record<CreatorCountry, AppLocale> = {
  日本: "ja",
  韓国: "ko",
  台湾: "zh-TW",
};

export function getInitialLocaleForCreatorCountry(
  country: CreatorCountry,
): AppLocale {
  return INITIAL_LOCALE_BY_CREATOR_COUNTRY[country];
}

export function getLocaleAfterInitialCreatorCountrySelection(
  country: CreatorCountry,
  currentLocale: AppLocale,
  localeWasManuallySelected: boolean,
): AppLocale {
  return localeWasManuallySelected
    ? currentLocale
    : getInitialLocaleForCreatorCountry(country);
}
