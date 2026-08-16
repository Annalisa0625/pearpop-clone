import assert from "node:assert/strict";
import test from "node:test";

import {
  getQuoteCheckoutRejection,
  isOwnedQuoteCheckout,
  isSafeTrendreLinkCheckoutMetadata,
} from "../lib/trendre-link/quote-checkout-policy.ts";

const now = Date.UTC(2026, 7, 3);

test("acceptedかつ期限内の見積もりだけCheckout可能", () => {
  assert.equal(
    getQuoteCheckoutRejection({
      status: "accepted",
      validUntil: new Date(now + 60_000).toISOString(),
      now,
    }),
    null
  );

  for (const status of ["sent", "declined", "expired", "cancelled"]) {
    assert.match(
      getQuoteCheckoutRejection({
        status,
        validUntil: new Date(now + 60_000).toISOString(),
        now,
      }) ?? "",
      /承認済み/
    );
  }
  assert.match(
    getQuoteCheckoutRejection({
      status: "accepted",
      validUntil: new Date(now).toISOString(),
      now,
    }) ?? "",
    /有効期限/
  );
});

test("quote accessとquoteの両方がCompany本人に属する場合だけ許可", () => {
  const owned = {
    userId: "company-a",
    accessUserId: "company-a",
    accessInquiryId: "inquiry-a",
    quoteCompanyUserId: "company-a",
    quoteInquiryId: "inquiry-a",
  };
  assert.equal(isOwnedQuoteCheckout(owned), true);
  assert.equal(isOwnedQuoteCheckout({ ...owned, accessUserId: "company-b" }), false);
  assert.equal(isOwnedQuoteCheckout({ ...owned, quoteCompanyUserId: "company-b" }), false);
  assert.equal(isOwnedQuoteCheckout({ ...owned, quoteInquiryId: "inquiry-b" }), false);
});

test("Stripe metadataの全識別子がDB由来の期待値と一致する", () => {
  const expected = {
    quoteId: "quote-id",
    inquiryId: "inquiry-id",
    companyUserId: "company-id",
    creatorUserId: "creator-id",
  };
  const metadata = {
    source: "trendre_link_quote",
    trendre_link_quote_id: expected.quoteId,
    trendre_link_inquiry_id: expected.inquiryId,
    supabase_user_id: expected.companyUserId,
    b_user_id: expected.companyUserId,
    creator_user_id: expected.creatorUserId,
  };

  assert.equal(isSafeTrendreLinkCheckoutMetadata(metadata, expected), true);
  assert.equal(
    isSafeTrendreLinkCheckoutMetadata(
      { ...metadata, supabase_user_id: "another-company" },
      expected
    ),
    false
  );
  assert.equal(
    isSafeTrendreLinkCheckoutMetadata(
      { ...metadata, trendre_link_quote_id: "another-quote" },
      expected
    ),
    false
  );
});
