// lib/i18n/locale.ts

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "./types";

const STORAGE_KEY = "app_locale";
const LOCALE_CHANGE_EVENT = "app-locale-change";

export function getInitialLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLocale(saved);

  return normalizeLocale(window.navigator.language);
}

export function setStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, locale);

  window.dispatchEvent(
    new CustomEvent<AppLocale>(LOCALE_CHANGE_EVENT, {
      detail: locale,
    })
  );
}

export function useAppLocale() {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(getInitialLocale());

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
    setStoredLocale(next);
    setLocaleState(next);
  };

  return { locale, setLocale };
}