import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInquiryReturnPath,
  createEmptyInquiryFormState,
  createInquiryDraft,
  parseInquiryDraft,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from "../lib/trendre-link/inquiry-return.ts";

test("Company登録後の戻り先は同一オリジンの公開Link相対パスになる", () => {
  assert.equal(
    buildInquiryReturnPath("trendre-gnufha"),
    "/in/trendre-gnufha?resume=inquiry"
  );
  assert.equal(
    buildInquiryReturnPath("//evil.example"),
    "/in/%2F%2Fevil.example?resume=inquiry"
  );
});

test("sessionStorageが利用不可・容量超過でも例外を外へ出さない", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const brokenStorage = {
    getItem() { throw new DOMException("blocked", "SecurityError"); },
    setItem() { throw new DOMException("full", "QuotaExceededError"); },
    removeItem() { throw new DOMException("blocked", "SecurityError"); },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: brokenStorage },
  });
  try {
    assert.equal(safeSessionStorageGet("draft"), null);
    assert.equal(safeSessionStorageSet("draft", "value"), false);
    assert.equal(safeSessionStorageRemove("draft"), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("入力中の依頼を同じslugでのみ復元する", () => {
  const now = Date.UTC(2026, 7, 3);
  const formId = "22222222-2222-4222-8222-222222222222";
  const submissionId = "11111111-1111-4111-8111-111111111111";
  const draft = createInquiryDraft({
    slug: "trendre-gnufha",
    formId,
    submissionId,
    kind: "pr",
    title: "見積もり依頼",
    form: { ...createEmptyInquiryFormState(), product_name: "新商品" },
    step: 5,
    now,
  });
  const serialized = JSON.stringify(draft);

  assert.deepEqual(
    parseInquiryDraft(serialized, { slug: "trendre-gnufha", formId, kind: "pr" }, now),
    draft
  );
  assert.equal(parseInquiryDraft(serialized, { slug: "other-creator" }, now), null);
  assert.equal(
    parseInquiryDraft(serialized, {
      slug: "trendre-gnufha",
      formId: "33333333-3333-4333-8333-333333333333",
    }, now),
    null
  );
});

test("期限切れ・改ざんされた依頼下書きを復元しない", () => {
  const now = Date.UTC(2026, 7, 3);
  const expired = createInquiryDraft({
    slug: "trendre-gnufha",
    formId: "22222222-2222-4222-8222-222222222222",
    submissionId: "11111111-1111-4111-8111-111111111111",
    kind: "pr",
    title: "見積もり依頼",
    form: { ...createEmptyInquiryFormState(), product_name: "新商品" },
    step: 5,
    now: now - 25 * 60 * 60 * 1000,
  });
  assert.equal(parseInquiryDraft(JSON.stringify(expired), { slug: expired.slug }, now), null);
  assert.equal(parseInquiryDraft("{not-json", { slug: expired.slug }, now), null);
  assert.equal(
    parseInquiryDraft(
      JSON.stringify({ ...expired, form: { product_name: ["broken"] }, savedAt: now }),
      { slug: expired.slug },
      now
    ),
    null
  );
});
