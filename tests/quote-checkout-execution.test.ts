import assert from "node:assert/strict";
import test from "node:test";

import { createStripeSessionForClaim } from "../lib/trendre-link/quote-checkout-execution.ts";

test("並行CheckoutのうちCAS leaseを保持する1件だけStripe createを呼ぶ", async () => {
  let leaseAvailable = true;
  let stripeCreates = 0;
  const run = () => createStripeSessionForClaim({
    verifyClaim: async () => {
      await Promise.resolve();
      if (!leaseAvailable) return false;
      leaseAvailable = false;
      return true;
    },
    createSession: async () => {
      stripeCreates += 1;
      return { id: "cs_one" };
    },
  });
  const settled = await Promise.allSettled([run(), run()]);
  assert.equal(stripeCreates, 1);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(settled.filter((result) => result.status === "rejected").length, 1);
});
