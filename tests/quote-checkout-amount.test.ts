import assert from "node:assert/strict";
import test from "node:test";

import { getQuoteCheckoutAmounts } from "../lib/trendre-link/quote-checkout-amount.ts";

test("Checkout金額はDBスナップショットだけから決定する", () => {
  const databaseQuote = {
    quotedAmount: 10_000,
    marketplaceFeeAmount: 2_000,
    buyerTotalAmount: 12_000,
    currency: "JPY",
  };
  const clientBody = { amount: 1, currency: "USD" };
  const result = getQuoteCheckoutAmounts(databaseQuote);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.totalStripeAmount, 12_000);
    assert.notEqual(result.totalStripeAmount, clientBody.amount);
    assert.notEqual(result.currency, clientBody.currency);
  }
});

test("不正通貨・0円・負数・小数・合計不一致を拒否する", () => {
  const valid = {
    quotedAmount: 10_000,
    marketplaceFeeAmount: 2_000,
    buyerTotalAmount: 12_000,
    currency: "JPY",
  };
  assert.deepEqual(getQuoteCheckoutAmounts({ ...valid, currency: "USD" }), { ok: false, reason: "currency" });
  assert.deepEqual(getQuoteCheckoutAmounts({ ...valid, quotedAmount: 0 }), { ok: false, reason: "amount" });
  assert.deepEqual(getQuoteCheckoutAmounts({ ...valid, marketplaceFeeAmount: -1 }), { ok: false, reason: "amount" });
  assert.deepEqual(getQuoteCheckoutAmounts({ ...valid, quotedAmount: 10_000.5 }), { ok: false, reason: "amount" });
  assert.deepEqual(getQuoteCheckoutAmounts({ ...valid, buyerTotalAmount: 11_999 }), { ok: false, reason: "total" });
});
