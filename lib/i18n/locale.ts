// lib/i18n/locale.ts

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "./types";

const STORAGE_KEY = "app_locale";
const COOKIE_KEY = "app_locale";
const LOCALE_CHANGE_EVENT = "app-locale-change";

export function getLocaleCookie(cookieValue?: string): AppLocale | null {
  if (cookieValue === undefined && typeof document === "undefined") return null;
  const prefix = `${COOKIE_KEY}=`;
  const value = (cookieValue ?? document.cookie)
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (value == null) return null;
  try {
    return normalizeLocale(decodeURIComponent(value));
  } catch {
    return normalizeLocale(value);
  }
}

export function getInitialLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const cookieLocale = getLocaleCookie();
  if (cookieLocale) return cookieLocale;

  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
}

export function setStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;

  const normalizedLocale = normalizeLocale(locale);

  window.localStorage.setItem(STORAGE_KEY, normalizedLocale);
  document.cookie = `${COOKIE_KEY}=${normalizedLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

  window.dispatchEvent(
    new CustomEvent<AppLocale>(LOCALE_CHANGE_EVENT, {
      detail: normalizedLocale,
    })
  );
}

type LocaleHookResult<TLocale extends AppLocale> = {
  locale: TLocale;
  setLocale: (next: AppLocale) => void;
  isLocaleReady: boolean;
};

export function getLegacyContentLocale(locale: AppLocale): "ja" | "en" {
  return locale === "en" ? "en" : "ja";
}

export function useAppLocale(options: { allLocales: true }): LocaleHookResult<AppLocale>;
export function useAppLocale(): LocaleHookResult<"ja" | "en">;
export function useAppLocale(options?: { allLocales: true }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setIsLocaleReady(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setLocaleState(normalizeLocale(event.newValue));
    };

    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLocale>;
      setLocaleState(normalizeLocale(customEvent.detail));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, []);

  const setLocale = (next: AppLocale) => {
    const normalizedLocale = normalizeLocale(next);
    setStoredLocale(normalizedLocale);
    setLocaleState(normalizedLocale);
  };

  // Until each screen has a four-locale dictionary, legacy consumers receive a
  // safe Japanese fallback. The stored preference remains unchanged.
  const visibleLocale = options?.allLocales
    ? locale
    : getLegacyContentLocale(locale);

  return { locale: visibleLocale, setLocale, isLocaleReady };
}
