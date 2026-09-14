import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  getInitialLocaleForCreatorCountry,
  getLocaleAfterInitialCreatorCountrySelection,
} from "../lib/i18n/options.ts";
import { creatorLinkOnboardingDictionary } from "../lib/i18n/creatorLink.ts";
import { APP_LOCALES } from "../lib/i18n/types.ts";

const root = resolve(process.cwd());

test("Creator Signup maps the initial Country to its native UI locale", () => {
  assert.equal(getInitialLocaleForCreatorCountry("日本"), "ja");
  assert.equal(getInitialLocaleForCreatorCountry("韓国"), "ko");
  assert.equal(getInitialLocaleForCreatorCountry("台湾"), "zh-TW");
});

test("a manually selected locale wins after the initial Country selection", () => {
  assert.equal(getLocaleAfterInitialCreatorCountrySelection("韓国", "ja", false), "ko");
  assert.equal(getLocaleAfterInitialCreatorCountrySelection("台湾", "ko", false), "zh-TW");
  assert.equal(getLocaleAfterInitialCreatorCountrySelection("韓国", "ja", true), "ja");
  assert.equal(getLocaleAfterInitialCreatorCountrySelection("日本", "zh-TW", true), "zh-TW");
});

test("Creator Signup starts with Country only and keeps the header locale selector", () => {
  const source = readFileSync(
    resolve(root, "app/signup/creator/SignupCreatorClient.tsx"),
    "utf8",
  );
  assert.match(source, /if \(!countrySelectionCompleted\)[\s\S]*CountrySelector/);
  assert.match(source, /<CountrySelector[\s\S]*?value=\{null\}[\s\S]*?onChange=\{handleInitialCountrySelection\}/);
  assert.match(source, /countrySelectionTitle/);
  assert.doesNotMatch(
    source.match(/if \(step === 0\)[\s\S]*?if \(step === 1\)/)?.[0] ?? "",
    /LocaleSelector|CountrySelector/,
  );
  assert.match(source, /onChange=\{handleLocaleChange\}/);
  assert.match(source, /localeManuallySelectedRef\.current = true/);
});

test("localized Creator pages request the full AppLocale instead of legacy Japanese fallback", () => {
  for (const file of [
    "app/creator/dashboard/page.tsx",
    "app/creator/jobs/page.tsx",
    "app/creator/requests/page.tsx",
    "app/creator/requests/[id]/page.tsx",
    "app/creator/profile/page.tsx",
  ]) {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.match(source, /useAppLocale\(\{ allLocales: true \}\)/, file);
  }
});

test("Creator Link first-run onboarding has complete Korean and Taiwan copy", () => {
  const expected = Object.keys(creatorLinkOnboardingDictionary.ja).sort();
  for (const locale of APP_LOCALES) {
    assert.deepEqual(Object.keys(creatorLinkOnboardingDictionary[locale]).sort(), expected);
  }
  for (const locale of ["ko", "zh-TW"] as const) {
    for (const key of ["displayTitle", "urlTitle", "socialTitle", "continue", "publish"] as const) {
      const value = creatorLinkOnboardingDictionary[locale][key];
      assert.ok(value.trim());
      assert.notEqual(value, creatorLinkOnboardingDictionary.ja[key]);
      assert.notEqual(value, creatorLinkOnboardingDictionary.en[key]);
    }
  }
});

test("Taiwan Creator Link onboarding contains no prohibited Mainland UI vocabulary", () => {
  const content = JSON.stringify(creatorLinkOnboardingDictionary["zh-TW"]);
  for (const prohibited of ["信息", "視頻", "接口", "鏈接", "軟件", "默認", "互聯網", "菜單"]) {
    assert.equal(content.includes(prohibited), false, prohibited);
  }
});
