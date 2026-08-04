import assert from "node:assert/strict";
import test from "node:test";

import {
  isInquirySubmissionId,
  isPublicInquiryFormTarget,
  matchesInquirySubmissionTarget,
} from "../lib/trendre-link/inquiry-submission.ts";

test("submission IDはUUIDだけを許可しフォームとpageの両方へ拘束する", () => {
  assert.equal(isInquirySubmissionId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isInquirySubmissionId("not-a-uuid"), false);
  const existing = { link_page_id: "page-a", inquiry_type_id: "form-a" };
  assert.equal(matchesInquirySubmissionTarget(existing, { pageId: "page-a", formId: "form-a" }), true);
  assert.equal(matchesInquirySubmissionTarget(existing, { pageId: "page-a", formId: "form-b" }), false);
  assert.equal(matchesInquirySubmissionTarget(existing, { pageId: "page-b", formId: "form-a" }), false);
});

test("公開中pageに属するenabledフォームだけを正しいkindで許可する", () => {
  const valid = {
    pageStatus: "published",
    isAcceptingInquiries: true,
    pageId: "page-a",
    formPageId: "page-a",
    formEnabled: true,
    requestedKind: "pr" as const,
    templateKey: "pr_post",
    isCustom: false,
  };
  assert.equal(isPublicInquiryFormTarget(valid), true);
  assert.equal(isPublicInquiryFormTarget({ ...valid, formPageId: "other-creator-page" }), false);
  assert.equal(isPublicInquiryFormTarget({ ...valid, formEnabled: false }), false);
  assert.equal(isPublicInquiryFormTarget({ ...valid, pageStatus: "draft" }), false);
  assert.equal(isPublicInquiryFormTarget({ ...valid, isAcceptingInquiries: false }), false);
  assert.equal(isPublicInquiryFormTarget({ ...valid, templateKey: null }), false);
  assert.equal(isPublicInquiryFormTarget({
    ...valid,
    requestedKind: "simple",
    templateKey: null,
    isCustom: true,
  }), true);
});

test("Company単位のunique制約相当で同時送信・レスポンス消失後再送を1件にする", async () => {
  const rows = new Map<string, string>();
  let inserts = 0;
  async function submit(companyId: string, submissionId: string) {
    const key = `${companyId}:${submissionId}`;
    await Promise.resolve();
    if (!rows.has(key)) {
      rows.set(key, `inquiry-${rows.size + 1}`);
      inserts += 1;
    }
    return rows.get(key);
  }
  const submissionId = "11111111-1111-4111-8111-111111111111";
  const [first, second] = await Promise.all([
    submit("company-a", submissionId),
    submit("company-a", submissionId),
  ]);
  const retried = await submit("company-a", submissionId);
  const otherCompany = await submit("company-b", submissionId);
  assert.equal(first, second);
  assert.equal(retried, first);
  assert.notEqual(otherCompany, first);
  assert.equal(inserts, 2);
});
