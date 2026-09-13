import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  creatorSignupAudienceCountryLabels,
  creatorSignupAvatarCropCopy,
  creatorSignupCategoryLabels,
  creatorSignupDictionary,
  creatorSignupFollowerRangeLabels,
  creatorSignupGenderLabels,
  creatorSignupMenuCopy,
  creatorSignupPrefectureLabels,
  creatorSignupStepTitles,
} from "../lib/i18n/creatorSignup.ts";
import { APP_LOCALES, type AppLocale } from "../lib/i18n/types.ts";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "function" || !value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("Creator Signup dictionary has the same runtime shape for every locale", () => {
  const expected = leafPaths(creatorSignupDictionary.ja).sort();
  for (const locale of APP_LOCALES) {
    assert.deepEqual(leafPaths(creatorSignupDictionary[locale]).sort(), expected, locale);
    assert.equal(creatorSignupStepTitles[locale].length, 7, locale);
    assert.deepEqual(Object.keys(creatorSignupGenderLabels[locale]), ["", "女性", "男性", "その他"]);
  }
});

test("Korean and Taiwan Signup use localized headings, CTAs, and validation", () => {
  const requiredKeys = [
    "displayTitle", "accountTitle", "categoryTitle", "socialTitle", "menuTitle",
    "continue", "finish", "displayNameRequired", "socialRequired", "menuRequired",
    "preparingTitle", "completionHeadlineCreatorOnly",
  ] as const;

  for (const locale of ["ko", "zh-TW"] as const) {
    const copy = creatorSignupDictionary[locale];
    for (const key of requiredKeys) {
      assert.notEqual(copy[key], creatorSignupDictionary.ja[key], `${locale}.${key} fell back to ja`);
      assert.notEqual(copy[key], creatorSignupDictionary.en[key], `${locale}.${key} fell back to en`);
      assert.ok(copy[key].trim(), `${locale}.${key}`);
    }
  }
});

test("localized Signup option resources cover categories, menus, countries, and follower ranges", () => {
  const translatedLocales: AppLocale[] = ["en", "ko", "zh-TW"];
  const categoryKeys = Object.keys(creatorSignupCategoryLabels.en).sort();
  assert.ok(categoryKeys.length >= 70);
  for (const locale of translatedLocales) {
    assert.deepEqual(Object.keys(creatorSignupCategoryLabels[locale]).sort(), categoryKeys, `${locale} categories`);
  }

  assert.equal(Object.keys(creatorSignupMenuCopy.ko).length, 10);
  assert.equal(Object.keys(creatorSignupMenuCopy["zh-TW"]).length, 10);
  assert.equal(Object.keys(creatorSignupPrefectureLabels.en).length, 47);
  assert.deepEqual(Object.keys(creatorSignupPrefectureLabels.ko).sort(), Object.keys(creatorSignupPrefectureLabels.en).sort());
  assert.deepEqual(Object.keys(creatorSignupPrefectureLabels["zh-TW"]).sort(), Object.keys(creatorSignupPrefectureLabels.en).sort());
  assert.deepEqual(Object.keys(creatorSignupAudienceCountryLabels.ko).sort(), Object.keys(creatorSignupAudienceCountryLabels.en).sort());
  assert.deepEqual(Object.keys(creatorSignupFollowerRangeLabels["zh-TW"]).sort(), Object.keys(creatorSignupFollowerRangeLabels.en).sort());
});

test("dynamic Signup copy returns usable text in every locale", () => {
  for (const locale of APP_LOCALES) {
    const copy = creatorSignupDictionary[locale];
    assert.ok(copy.progress(2, 7));
    assert.ok(copy.socialItem(1));
    assert.ok(copy.menuItem(1));
    for (const value of Object.values(creatorSignupAvatarCropCopy[locale])) assert.ok(value.trim());
  }
});

test("Taiwan Signup resources contain no prohibited Mainland UI vocabulary", () => {
  const taiwanResources = JSON.stringify({
    copy: creatorSignupDictionary["zh-TW"],
    categories: creatorSignupCategoryLabels["zh-TW"],
    countries: creatorSignupAudienceCountryLabels["zh-TW"],
    followers: creatorSignupFollowerRangeLabels["zh-TW"],
    menus: creatorSignupMenuCopy["zh-TW"],
    crop: creatorSignupAvatarCropCopy["zh-TW"],
  });
  for (const prohibited of ["信息", "視頻", "接口", "鏈接", "軟件", "默認", "互聯網", "菜單"]) {
    assert.equal(taiwanResources.includes(prohibited), false, prohibited);
  }
});

test("Signup no longer uses the legacy ja/en content fallback", () => {
  const source = readFileSync(resolve(process.cwd(), "app/signup/creator/SignupCreatorClient.tsx"), "utf8");
  assert.doesNotMatch(source, /getLegacyContentLocale|appLocale/);
  assert.match(source, /creatorSignupDictionary\[locale\]/);
});
