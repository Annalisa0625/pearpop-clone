import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { commonDictionary } from "../lib/i18n/common.ts";
import {
  getInitialLocale,
  getLegacyContentLocale,
  getLocaleCookie,
  setStoredLocale,
} from "../lib/i18n/locale.ts";
import { LOCALE_OPTIONS } from "../lib/i18n/options.ts";
import { getRequestStatusMeta } from "../lib/i18n/requestStatus.ts";
import {
  APP_LOCALES,
  normalizeLocale,
  type AppLocale,
} from "../lib/i18n/types.ts";

const root = resolve(process.cwd());
const runtime = globalThis as Record<string, unknown>;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalCustomEvent = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");

function restoreGlobal(name: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}

afterEach(() => {
  restoreGlobal("window", originalWindow);
  restoreGlobal("document", originalDocument);
  restoreGlobal("CustomEvent", originalCustomEvent);
});

function installBrowserState(savedLocale: string | null, cookie: string) {
  const values = new Map<string, string>();
  if (savedLocale !== null) values.set("app_locale", savedLocale);
  const dispatched: Event[] = [];
  let currentCookie = cookie;

  class TestCustomEvent<T> extends Event {
    detail: T;
    constructor(type: string, init: { detail: T }) {
      super(type);
      this.detail = init.detail;
    }
  }

  runtime.CustomEvent = TestCustomEvent;
  runtime.window = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    dispatchEvent: (event: Event) => {
      dispatched.push(event);
      return true;
    },
  };
  runtime.document = {
    get cookie() { return currentCookie; },
    set cookie(value: string) { currentCookie = value; },
  };

  return { values, dispatched, get cookie() { return currentCookie; } };
}

test("normalizeLocale supports the four locales without converting Simplified Chinese", () => {
  const cases: Array<[string | null | undefined, AppLocale]> = [
    ["ja", "ja"], ["ja-JP", "ja"], ["en", "en"], ["en-US", "en"],
    ["en-GB", "en"], ["ko", "ko"], ["ko-KR", "ko"],
    ["zh-TW", "zh-TW"], ["zh-Hant", "zh-TW"],
    ["zh-Hant-TW", "zh-TW"], ["zh-CN", "ja"], ["zh-Hans", "ja"],
    ["zh-Hans-CN", "ja"], ["ZH-TW", "zh-TW"], [" zh-TW ", "zh-TW"],
    [" KO-kr ", "ko"],
    ["invalid", "ja"], ["", "ja"], [null, "ja"], [undefined, "ja"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeLocale(input), expected, String(input));
  }
});

test("cookie restoration supports ja, en, ko, and zh-TW", () => {
  for (const locale of APP_LOCALES) {
    assert.equal(getLocaleCookie(`other=x; app_locale=${locale}; theme=light`), locale);
  }
  assert.equal(getLocaleCookie("other=x"), null);
  assert.equal(getLocaleCookie("app_locale=%"), "ja");
});

test("localStorage restoration supports all locales and keeps existing English", () => {
  for (const locale of APP_LOCALES) {
    installBrowserState(locale, "");
    assert.equal(getInitialLocale(), locale);
  }
});

test("cookie takes precedence and setStoredLocale updates both persistence channels", () => {
  const browser = installBrowserState("en", "app_locale=ko");
  assert.equal(getInitialLocale(), "ko");

  setStoredLocale("zh-TW");
  assert.equal(browser.values.get("app_locale"), "zh-TW");
  assert.match(browser.cookie, /^app_locale=zh-TW;/);
  assert.equal(browser.dispatched.length, 1);
  assert.equal(browser.dispatched[0].type, "app-locale-change");
  assert.equal((browser.dispatched[0] as CustomEvent<AppLocale>).detail, "zh-TW");
});

test("legacy screens use a safe ja/en view without changing the stored locale", () => {
  assert.equal(getLegacyContentLocale("ja"), "ja");
  assert.equal(getLegacyContentLocale("en"), "en");
  assert.equal(getLegacyContentLocale("ko"), "ja");
  assert.equal(getLegacyContentLocale("zh-TW"), "ja");
});

function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("common and request status dictionaries are complete for every locale", () => {
  const expectedPaths = leafPaths(commonDictionary.ja).sort();
  for (const locale of APP_LOCALES) {
    assert.deepEqual(leafPaths(commonDictionary[locale]).sort(), expectedPaths);
    for (const status of ["pending", "accepted", "delivered", "completed", "rejected"]) {
      const meta = getRequestStatusMeta(status, locale);
      assert.ok(meta.label);
      assert.ok(meta.shortLabel);
    }
    assert.ok(getRequestStatusMeta("invalid", locale).label);
  }
});

test("LocaleSelector exposes four controlled, accessible choices", () => {
  assert.deepEqual(LOCALE_OPTIONS.map((option) => option.value), ["ja", "ko", "zh-TW", "en"]);
  assert.deepEqual(LOCALE_OPTIONS.map((option) => option.label), ["日本語", "한국어", "繁體中文", "English"]);

  const source = readFileSync(resolve(root, "components/i18n/LocaleSelector.tsx"), "utf8");
  assert.match(source, /type="radio"/);
  assert.match(source, /checked=\{selected\}/);
  assert.match(source, /onChange=\{\(\) => onChange\(option\.value\)\}/);
  assert.match(source, /const name = useId\(\)/);
  assert.match(source, /<legend className="sr-only">\{ariaLabel\}<\/legend>/);
  assert.match(source, /focus-visible/);
  assert.match(source, /disabled=\{disabled\}/);
});

test("Signup and Profile wire Country and UI Locale to independent handlers", () => {
  for (const file of [
    "app/signup/creator/SignupCreatorClient.tsx",
    "app/creator/profile/page.tsx",
  ]) {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.match(source, /<CountrySelector[\s\S]*?onChange=\{handleCountryChange\}/);
    assert.match(source, /<LocaleSelector[\s\S]*?value=\{locale\}[\s\S]*?onChange=\{setLocale\}/);
  }
});
