import assert from "node:assert/strict";
import test from "node:test";

import {
  createCreatorLinkInquiryFormSelection,
  mapPublicCreatorLinkInquiryTypes,
} from "../lib/trendre-link/public-inquiry-types.ts";

const prFormId = "11111111-1111-4111-8111-111111111111";

test("公開問い合わせ行のIDと並び順をCanvas用データへ保持する", () => {
  const [form] = mapPublicCreatorLinkInquiryTypes([
    {
      id: prFormId,
      sort_order: 2,
      template_key: "pr_post",
      title: "PR案件を依頼する",
      description: null,
      is_custom: false,
    },
  ]);

  assert.deepEqual(form, {
    id: prFormId,
    sortOrder: 2,
    templateKey: "pr_post",
    title: "PR案件を依頼する",
    description: null,
    isCustom: false,
  });
});

test("IDが欠けた公開問い合わせ行はクリック不能なフォームとして表示しない", () => {
  const forms = mapPublicCreatorLinkInquiryTypes([
    {
      sort_order: 0,
      template_key: "pr_post",
      title: "PR案件を依頼する",
      description: null,
      is_custom: false,
    },
  ]);

  assert.deepEqual(forms, []);
});

test("IDを持つPRフォームからInquiryFormModal用の選択情報を作成する", () => {
  const [form] = mapPublicCreatorLinkInquiryTypes([
    {
      id: prFormId,
      sort_order: 0,
      template_key: "pr_post",
      title: "PR案件を依頼する",
      description: null,
      is_custom: false,
    },
  ]);

  assert.ok(form);
  assert.deepEqual(createCreatorLinkInquiryFormSelection(form), {
    id: prFormId,
    kind: "pr",
    title: "PR案件を依頼する",
  });
});
