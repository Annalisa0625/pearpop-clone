// lib/i18n/locale.ts

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "./types";

const STORAGE_KEY = "app_locale";
const COOKIE_KEY = "app_locale";
const LOCALE_CHANGE_EVENT = "app-locale-change";

function getLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const prefix = `${COOKIE_KEY}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return value === "ja" || value === "en" ? value : null;
}

export function getInitialLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const cookieLocale = getLocaleCookie();
  if (cookieLocale) return cookieLocale;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : DEFAULT_LOCALE;
}

export function setStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, locale);
  document.cookie = `${COOKIE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;

  window.dispatchEvent(
    new CustomEvent<AppLocale>(LOCALE_CHANGE_EVENT, {
      detail: locale,
    })
  );
}

export function useAppLocale() {
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
    setStoredLocale(next);
    setLocaleState(next);
  };

  return { locale, setLocale, isLocaleReady };
}
