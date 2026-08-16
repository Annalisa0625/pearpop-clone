import assert from "node:assert/strict";
import test from "node:test";

import { authorizeCheckoutCompany } from "../lib/trendre-link/quote-checkout-company.ts";

const approved = {
  user_id: "company-a",
  approval_status: "approved",
  company_name: "Example",
  contact_email: "billing@example.com",
};

test("approved Company本人だけCheckout認可を通過する", async () => {
  assert.deepEqual(
    await authorizeCheckoutCompany({
      userId: "company-a",
      loadCompany: async () => approved,
    }),
    { ok: true, company: approved }
  );
});

for (const approvalStatus of ["pending", "rejected", "suspended"]) {
  test(`${approvalStatus} CompanyをStripe呼び出し前に拒否する`, async () => {
    let stripeCalls = 0;
    const result = await authorizeCheckoutCompany({
      userId: "company-a",
      loadCompany: async () => ({ ...approved, approval_status: approvalStatus }),
    });
    if (result.ok) stripeCalls += 1;
    assert.deepEqual(result, { ok: false, reason: "not_approved" });
    assert.equal(stripeCalls, 0);
  });
}

test("Companyなし・別Companyのレコードを拒否する", async () => {
  assert.deepEqual(
    await authorizeCheckoutCompany({ userId: "company-a", loadCompany: async () => null }),
    { ok: false, reason: "missing" }
  );
  assert.deepEqual(
    await authorizeCheckoutCompany({
      userId: "company-a",
      loadCompany: async () => ({ ...approved, user_id: "company-b" }),
    }),
    { ok: false, reason: "owner_mismatch" }
  );
});
