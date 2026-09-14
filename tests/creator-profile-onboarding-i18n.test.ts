import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { creatorOnboardingDictionary } from "../lib/i18n/creatorOnboarding.ts";
import {
  creatorProfileAudienceCountryLabels,
  creatorProfileCategoryLabels,
  creatorProfileDictionary,
  creatorProfileFollowerRangeLabels,
  creatorProfileGenreGroupLabels,
  creatorProfileLanguageLabels,
  creatorProfilePrefectureLabels,
  localizeCreatorProfileValue,
} from "../lib/i18n/creatorProfile.ts";
import { APP_LOCALES } from "../lib/i18n/types.ts";

function keys(value: object) {
  return Object.keys(value).sort();
}

test("Creator Profile dictionary has the same runtime keys for every locale", () => {
  const expected = keys(creatorProfileDictionary.ja);
  for (const locale of APP_LOCALES) {
    assert.deepEqual(keys(creatorProfileDictionary[locale]), expected, locale);
    for (const value of Object.values(creatorProfileDictionary[locale])) {
      assert.equal(typeof value, "string", locale);
      assert.ok(value.trim(), locale);
    }
  }
});

test("Creator Onboarding dictionary has four complete slides in every locale", () => {
  const expected = keys(creatorOnboardingDictionary.ja);
  for (const locale of APP_LOCALES) {
    const copy = creatorOnboardingDictionary[locale];
    assert.deepEqual(keys(copy), expected, locale);
    assert.equal(copy.slides.length, 4, locale);
    assert.equal(copy.nonPaidSlides.length, 3, locale);
    for (const slide of copy.slides) {
      assert.ok(slide.title.trim(), `${locale} title`);
      assert.ok(slide.body.trim(), `${locale} body`);
    }
    for (const slide of copy.nonPaidSlides) {
      assert.ok(slide.title.trim(), `${locale} non-paid title`);
      assert.ok(slide.body.trim(), `${locale} non-paid body`);
    }
  }
});

test("Korean and Taiwan Profile and Onboarding copy do not fall back to Japanese or English", () => {
  const profileKeys = [
    "title", "subtitle", "categoryTitle", "areaTitle", "socialTitle", "save",
    "usernameRequired", "areaRequired", "socialIncomplete", "lineConnect",
  ] as const;
  const onboardingKeys = ["title", "checkingError", "skip", "next", "start"] as const;

  for (const locale of ["ko", "zh-TW"] as const) {
    for (const key of profileKeys) {
      assert.notEqual(creatorProfileDictionary[locale][key], creatorProfileDictionary.ja[key], `${locale}.${key} fell back to ja`);
      assert.notEqual(creatorProfileDictionary[locale][key], creatorProfileDictionary.en[key], `${locale}.${key} fell back to en`);
    }
    for (const key of onboardingKeys) {
      assert.notEqual(creatorOnboardingDictionary[locale][key], creatorOnboardingDictionary.ja[key], `${locale}.${key} fell back to ja`);
      assert.notEqual(creatorOnboardingDictionary[locale][key], creatorOnboardingDictionary.en[key], `${locale}.${key} fell back to en`);
    }
    assert.notEqual(creatorOnboardingDictionary[locale].slides[0].body, creatorOnboardingDictionary.ja.slides[0].body);
    assert.notEqual(creatorOnboardingDictionary[locale].slides[0].body, creatorOnboardingDictionary.en.slides[0].body);
    assert.notEqual(creatorOnboardingDictionary[locale].nonPaidSlides[0].body, creatorOnboardingDictionary.ja.nonPaidSlides[0].body);
    assert.notEqual(creatorOnboardingDictionary[locale].nonPaidSlides[0].body, creatorOnboardingDictionary.en.nonPaidSlides[0].body);
  }
});

test("Profile option resources localize canonical values without changing those values", () => {
  const resources = [
    creatorProfileCategoryLabels,
    creatorProfileAudienceCountryLabels,
    creatorProfileFollowerRangeLabels,
    creatorProfilePrefectureLabels,
    creatorProfileLanguageLabels,
    creatorProfileGenreGroupLabels,
  ];
  for (const resource of resources) {
    for (const locale of APP_LOCALES) assert.ok(resource[locale], locale);
  }

  assert.equal(localizeCreatorProfileValue("ko", "美容サロン", creatorProfileCategoryLabels), "뷰티 살롱");
  assert.equal(localizeCreatorProfileValue("zh-TW", "東京都", creatorProfilePrefectureLabels), "東京都");
  assert.equal(localizeCreatorProfileValue("ko", "日本語", creatorProfileLanguageLabels), "일본어");
  assert.equal(localizeCreatorProfileValue("zh-TW", "日本語", creatorProfileLanguageLabels), "日文");
  assert.equal(localizeCreatorProfileValue("en", "unknown", creatorProfileCategoryLabels), "unknown");
});

test("Taiwan Profile and Onboarding resources contain no prohibited Mainland UI vocabulary", () => {
  const resources = JSON.stringify({
    profile: creatorProfileDictionary["zh-TW"],
    onboarding: creatorOnboardingDictionary["zh-TW"],
    categories: creatorProfileCategoryLabels["zh-TW"],
    audience: creatorProfileAudienceCountryLabels["zh-TW"],
    languages: creatorProfileLanguageLabels["zh-TW"],
  });
  for (const prohibited of ["信息", "視頻", "接口", "鏈接", "軟件", "默認", "互聯網", "菜單"]) {
    assert.equal(resources.includes(prohibited), false, prohibited);
  }
});

test("Profile and Onboarding consume AppLocale directly and keep locale outside profile payload", () => {
  const profile = readFileSync(resolve(process.cwd(), "app/creator/profile/page.tsx"), "utf8");
  const onboarding = readFileSync(resolve(process.cwd(), "app/creator/onboarding/page.tsx"), "utf8");

  assert.doesNotMatch(profile, /getLegacyContentLocale|safeLocale/);
  assert.match(profile, /creatorProfileDictionary\[locale\]/);
  assert.match(profile, /value=\{locale\}[\s\S]*onChange=\{setLocale\}/);
  assert.match(profile, /const handleCountryChange[\s\S]*setCountry\(location\.country\)[\s\S]*setPrefectures\(location\.prefectures\)/);
  assert.doesNotMatch(profile.match(/const handleCountryChange[\s\S]*?^  \};/m)?.[0] ?? "", /setLocale/);

  const profileSaveStart = profile.indexOf('fetch("/api/creator/profile"');
  const metadataSyncStart = profile.indexOf("supabase.auth.updateUser", profileSaveStart);
  const profilePayload = profile.slice(profileSaveStart, metadataSyncStart);
  assert.ok(profilePayload);
  assert.doesNotMatch(profilePayload, /app_locale|\blocale\b/);
  assert.match(profilePayload, /contentLanguage: normalizedContentLanguage/);
  assert.match(profilePayload, /responseLanguage: normalizedResponseLanguage/);

  assert.doesNotMatch(onboarding, /locale === "ja"|locale === "en"|getLegacyContentLocale/);
  assert.match(onboarding, /creatorOnboardingDictionary\[locale\]/);
});
