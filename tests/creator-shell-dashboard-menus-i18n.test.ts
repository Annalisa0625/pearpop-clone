import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { getCreatorDashboardCopy } from "../lib/i18n/creatorDashboard.ts";
import {
  creatorMenuCommonDictionary,
  creatorMenuEditorDictionary,
  creatorMenuFormatDictionary,
  creatorMenuListDictionary,
  creatorMenuOptionDictionary,
  localizeCreatorMenuRecord,
} from "../lib/i18n/creatorMenus.ts";
import { creatorShellDictionary } from "../lib/i18n/creatorShell.ts";
import { APP_LOCALES } from "../lib/i18n/types.ts";

const keys = (value: object) => Object.keys(value).sort();

test("Creator Shell, Dashboard, and Menus resources are complete for all locales", () => {
  const dictionaries = [
    creatorShellDictionary,
    creatorMenuCommonDictionary,
    creatorMenuEditorDictionary,
    creatorMenuListDictionary,
    creatorMenuFormatDictionary,
    creatorMenuOptionDictionary,
  ];
  for (const dictionary of dictionaries) {
    const expected = keys(dictionary.ja);
    for (const locale of APP_LOCALES) {
      assert.deepEqual(keys(dictionary[locale]), expected, locale);
    }
  }
  const expectedDashboard = keys(getCreatorDashboardCopy("ja", false));
  for (const locale of APP_LOCALES) {
    assert.deepEqual(keys(getCreatorDashboardCopy(locale, false)), expectedDashboard, locale);
    assert.deepEqual(keys(getCreatorDashboardCopy(locale, true)), expectedDashboard, locale);
  }
});

test("Korean and Taiwan primary copy does not fall back to Japanese or English", () => {
  for (const locale of ["ko", "zh-TW"] as const) {
    for (const key of ["home", "orders", "jobs", "profile"] as const) {
      assert.notEqual(creatorShellDictionary[locale][key], creatorShellDictionary.ja[key]);
      assert.notEqual(creatorShellDictionary[locale][key], creatorShellDictionary.en[key]);
    }
    const dashboard = getCreatorDashboardCopy(locale, false);
    for (const key of ["overview", "attention", "jobs", "startMartCta"] as const) {
      assert.notEqual(dashboard[key], getCreatorDashboardCopy("ja", false)[key]);
      assert.notEqual(dashboard[key], getCreatorDashboardCopy("en", false)[key]);
    }
    for (const key of ["title", "subtitle", "createNew", "emptyTitle"] as const) {
      assert.notEqual(creatorMenuListDictionary[locale][key], creatorMenuListDictionary.ja[key]);
      assert.notEqual(creatorMenuListDictionary[locale][key], creatorMenuListDictionary.en[key]);
    }
    for (const key of ["createTitle", "editTitle", "menuHelp", "priceInvalid"] as const) {
      assert.notEqual(creatorMenuEditorDictionary[locale][key], creatorMenuEditorDictionary.ja[key]);
      assert.notEqual(creatorMenuEditorDictionary[locale][key], creatorMenuEditorDictionary.en[key]);
    }
  }
});

test("Taiwan resources do not contain prohibited Mainland UI vocabulary", () => {
  const resources = JSON.stringify({
    shell: creatorShellDictionary["zh-TW"],
    dashboard: getCreatorDashboardCopy("zh-TW", false),
    menuCommon: creatorMenuCommonDictionary["zh-TW"],
    menuEditor: creatorMenuEditorDictionary["zh-TW"],
    menuList: creatorMenuListDictionary["zh-TW"],
    menuOptions: creatorMenuOptionDictionary["zh-TW"],
  });
  for (const prohibited of ["信息", "視頻", "接口", "鏈接", "軟件", "默認", "互聯網", "菜單"]) {
    assert.equal(resources.includes(prohibited), false, prohibited);
  }
});

test("translated menu labels remain display-only while canonical payload values stay unchanged", () => {
  assert.equal(creatorMenuOptionDictionary.ko["Instagram投稿"].label, "Instagram 피드 게시물");
  assert.equal(creatorMenuOptionDictionary["zh-TW"]["投稿なし・動画素材のみ納品"].label, "僅交付影片素材");
  assert.deepEqual(
    localizeCreatorMenuRecord("ko", "動画素材のみ納品", "広告やSNSで使える動画素材だけを納品します。自分のアカウントには投稿しません。"),
    { title: "영상 소재만 납품", description: "광고와 SNS에 사용할 영상 소재만 납품하며 내 계정에는 게시하지 않습니다." },
  );
  assert.deepEqual(localizeCreatorMenuRecord("zh-TW", "Custom", "Custom body"), { title: "Custom", description: "Custom body" });
  assert.deepEqual(localizeCreatorMenuRecord("ko", "Instagram投稿", "Custom body"), { title: "Instagram 피드 게시물", description: "Custom body" });

  for (const path of ["app/creator/menus/new/page.tsx", "app/creator/menus/[id]/edit/page.tsx"]) {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    assert.match(source, /title: selectedMenu\.labelJa/);
    assert.match(source, /description: selectedMenu\.helpJa/);
    assert.match(source, /deliverables: selectedMenu\.labelJa/);
    assert.match(source, /menu_type: menuType/);
    assert.match(source, /currency: "JPY"/);
    assert.doesNotMatch(source, /safeLocale|getLegacyContentLocale/);
  }
});

test("translated target pages consume the full AppLocale without binary fallback", () => {
  for (const path of [
    "app/creator/CreatorLayoutShell.tsx",
    "app/creator/dashboard/page.tsx",
    "app/creator/menus/page.tsx",
    "app/creator/menus/new/page.tsx",
    "app/creator/menus/[id]/edit/page.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    assert.doesNotMatch(source, /safeLocale|getLegacyContentLocale|locale === "ja"|locale === "en"/, path);
  }
});
