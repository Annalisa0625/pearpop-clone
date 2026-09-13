import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { creatorJobsDictionary } from "../lib/i18n/creatorJobs.ts";
import {
  creatorInquiryDictionary,
  creatorInquiryValueLabels,
  creatorOrderDetailTranslations,
  creatorQuoteStatusDictionary,
  getCreatorOrdersCopy,
} from "../lib/i18n/creatorOrders.ts";
import {
  creatorRequestDetailDictionary,
  creatorRequestsDictionary,
} from "../lib/i18n/creatorRequests.ts";
import { APP_LOCALES } from "../lib/i18n/types.ts";

const keys = (value: object) => Object.keys(value).sort();

test("Creator Requests, Jobs, and Orders resources are complete for every locale", () => {
  const dictionaries = [
    creatorJobsDictionary,
    creatorRequestsDictionary,
    creatorRequestDetailDictionary,
    creatorQuoteStatusDictionary,
    creatorInquiryDictionary,
    creatorInquiryValueLabels,
  ];

  for (const dictionary of dictionaries) {
    const expected = keys(dictionary.ja);
    for (const locale of APP_LOCALES) {
      assert.deepEqual(keys(dictionary[locale]), expected, `${locale} resource keys`);
    }
  }

  const expectedOrders = keys(getCreatorOrdersCopy("ja", false));
  for (const locale of APP_LOCALES) {
    assert.deepEqual(keys(getCreatorOrdersCopy(locale, false)), expectedOrders, `${locale} orders`);
    assert.deepEqual(keys(getCreatorOrdersCopy(locale, true)), expectedOrders, `${locale} inquiries`);
  }

  assert.deepEqual(
    keys(creatorOrderDetailTranslations.ko ?? {}),
    keys(creatorOrderDetailTranslations["zh-TW"] ?? {}),
    "Korean and Taiwan order-detail resources must cover the same fields",
  );
});

test("Korean and Taiwan primary copy does not fall back to Japanese or English", () => {
  const requestKeys = ["title", "actionBubble", "profileCta", "empty"] as const;
  const requestDetailKeys = ["title", "accept", "reject", "deliverSubmit", "deliverRequired"] as const;
  const jobKeys = ["title", "noMessage", "emptyJobs", "emptyMessages"] as const;
  const inquiryKeys = ["title", "decline", "createQuote", "send", "quoteInvalid"] as const;

  for (const locale of ["ko", "zh-TW"] as const) {
    for (const key of requestKeys) {
      assert.notEqual(creatorRequestsDictionary[locale][key], creatorRequestsDictionary.ja[key]);
      assert.notEqual(creatorRequestsDictionary[locale][key], creatorRequestsDictionary.en[key]);
    }
    for (const key of requestDetailKeys) {
      assert.notEqual(creatorRequestDetailDictionary[locale][key], creatorRequestDetailDictionary.ja[key]);
      assert.notEqual(creatorRequestDetailDictionary[locale][key], creatorRequestDetailDictionary.en[key]);
    }
    for (const key of jobKeys) {
      assert.notEqual(creatorJobsDictionary[locale][key], creatorJobsDictionary.ja[key]);
      assert.notEqual(creatorJobsDictionary[locale][key], creatorJobsDictionary.en[key]);
    }
    for (const key of inquiryKeys) {
      assert.notEqual(creatorInquiryDictionary[locale][key], creatorInquiryDictionary.ja[key]);
      assert.notEqual(creatorInquiryDictionary[locale][key], creatorInquiryDictionary.en[key]);
    }
    const orders = getCreatorOrdersCopy(locale, false);
    assert.notEqual(orders.title, getCreatorOrdersCopy("ja", false).title);
    assert.notEqual(orders.title, getCreatorOrdersCopy("en", false).title);
  }
});

test("Taiwan resources do not contain prohibited Mainland UI vocabulary", () => {
  const resources = JSON.stringify({
    jobs: creatorJobsDictionary["zh-TW"],
    requests: creatorRequestsDictionary["zh-TW"],
    requestDetail: creatorRequestDetailDictionary["zh-TW"],
    orders: getCreatorOrdersCopy("zh-TW", false),
    orderDetail: creatorOrderDetailTranslations["zh-TW"],
    quoteStatuses: creatorQuoteStatusDictionary["zh-TW"],
    inquiry: creatorInquiryDictionary["zh-TW"],
    inquiryValues: creatorInquiryValueLabels["zh-TW"],
  });
  for (const prohibited of ["信息", "視頻", "接口", "鏈接", "軟件", "默認", "互聯網", "菜單"]) {
    assert.equal(resources.includes(prohibited), false, prohibited);
  }
});

test("order detail overlays cover every legacy display-copy key", () => {
  const source = readFileSync(resolve(process.cwd(), "app/creator/orders/[id]/page.tsx"), "utf8");
  const start = source.indexOf('legacyLocale === "ja"');
  const end = source.indexOf("        : {", start);
  assert.ok(start >= 0 && end > start, "Japanese base-copy branch was not found");
  const baseKeys = [...source.slice(start, end).matchAll(/^\s{12}([A-Za-z][A-Za-z0-9]*):/gm)]
    .map((match) => match[1])
    .sort();
  assert.ok(baseKeys.length > 100, "Expected the complete order-detail copy resource");
  assert.deepEqual(keys(creatorOrderDetailTranslations.ko ?? {}), baseKeys);
  assert.deepEqual(keys(creatorOrderDetailTranslations["zh-TW"] ?? {}), baseKeys);
});

test("translated labels remain display-only and canonical workflow payloads are unchanged", () => {
  const requestDetail = readFileSync(resolve(process.cwd(), "app/creator/requests/[id]/page.tsx"), "utf8");
  assert.match(requestDetail, /body: JSON\.stringify\(\{ action \}\)/);
  assert.match(requestDetail, /status: "accepted"/);
  assert.match(requestDetail, /status: "delivered"/);

  const inquiry = readFileSync(resolve(process.cwd(), "app/creator/orders/inquiries/[id]/page.tsx"), "utf8");
  assert.match(inquiry, /JSON\.stringify\(\{ quotedAmount: amount, note \}\)/);
  assert.match(inquiry, /JSON\.stringify\(\{ status: "declined" \}\)/);
  assert.match(inquiry, /status: "quoted"/);

  const orderDetail = readFileSync(resolve(process.cwd(), "app/creator/orders/[id]/page.tsx"), "utf8");
  for (const status of ["checkout_pending", "authorized_pending_creator", "accepted_captured", "in_progress", "delivered", "revision_requested", "completed"] ) {
    assert.ok(orderDetail.includes(`"${status}"`), status);
  }
  assert.match(orderDetail, /payment_status === "authorized"/);
  assert.match(orderDetail, /payment_status === "captured"/);
  assert.doesNotMatch(orderDetail, /safeLocale|getLegacyContentLocale/);
});

test("payment copy preserves authorization, capture, payout, and completion semantics", () => {
  assert.equal(creatorOrderDetailTranslations.ko?.payoutCapturedAt, "결제 확정일");
  assert.equal(creatorOrderDetailTranslations["zh-TW"]?.payoutCapturedAt, "款項確認日期");
  assert.equal(creatorOrderDetailTranslations.ko?.payoutPaidAt, "지급일");
  assert.equal(creatorOrderDetailTranslations["zh-TW"]?.payoutPaidAt, "付款日期");
  assert.notEqual(creatorOrderDetailTranslations.ko?.payoutCapturedAt, creatorOrderDetailTranslations.ko?.payoutPaidAt);
  assert.notEqual(creatorOrderDetailTranslations["zh-TW"]?.payoutCapturedAt, creatorOrderDetailTranslations["zh-TW"]?.payoutPaidAt);
});
