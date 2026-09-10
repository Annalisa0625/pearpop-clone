import assert from "node:assert/strict";
import test from "node:test";

import { calculateOrderFees } from "../lib/orders/fees.ts";

const eligibleCompanyCreatedAt = "2026-09-30T14:59:59.999Z";
const campaignTime = "2026-09-30T15:00:00.000Z";

function calculate(menuPriceAmount: number, buyerCompanyCreatedAt: string | null, calculatedAt: string) {
  return calculateOrderFees({
    menuPriceAmount,
    buyerPlanCode: "global_pro",
    buyerCompanyCreatedAt,
    calculatedAt,
  });
}

test("uses the standard 20% buyer fee", () => {
  assert.deepEqual(calculate(3000, null, campaignTime), {
    menuPriceAmount: 3000,
    buyerPlanCodeSnapshot: "global_pro",
    buyerPlanPublicNameSnapshot: "premium",
    buyerMarketplaceFeeRateBps: 2000,
    buyerMarketplaceFeeAmount: 600,
    creatorTransactionFeeRateBps: 1500,
    creatorTransactionFeeAmount: 450,
    buyerTotalAmount: 3600,
    creatorPayoutAmount: 2550,
    platformGrossRevenueAmount: 1050,
  });
});

test("uses the 5% early-company buyer fee", () => {
  assert.deepEqual(calculate(3000, eligibleCompanyCreatedAt, campaignTime), {
    menuPriceAmount: 3000,
    buyerPlanCodeSnapshot: "global_pro",
    buyerPlanPublicNameSnapshot: "premium",
    buyerMarketplaceFeeRateBps: 500,
    buyerMarketplaceFeeAmount: 150,
    creatorTransactionFeeRateBps: 1500,
    creatorTransactionFeeAmount: 450,
    buyerTotalAmount: 3150,
    creatorPayoutAmount: 2550,
    platformGrossRevenueAmount: 600,
  });
});

test("calculates ﾂ･10,000 standard and early-company totals", () => {
  const standard = calculate(10000, null, campaignTime);
  const early = calculate(10000, eligibleCompanyCreatedAt, campaignTime);

  assert.deepEqual(
    [standard.buyerMarketplaceFeeAmount, standard.buyerTotalAmount, standard.creatorTransactionFeeAmount, standard.creatorPayoutAmount, standard.platformGrossRevenueAmount],
    [2000, 12000, 1500, 8500, 3500]
  );
  assert.deepEqual(
    [early.buyerMarketplaceFeeAmount, early.buyerTotalAmount, early.creatorTransactionFeeAmount, early.creatorPayoutAmount, early.platformGrossRevenueAmount],
    [500, 10500, 1500, 8500, 2000]
  );
});

test("applies the early-company campaign boundaries", () => {
  assert.equal(calculate(3000, "2026-09-30T14:59:59.999Z", "2026-09-30T15:00:00.000Z").buyerMarketplaceFeeRateBps, 500);
  assert.equal(calculate(3000, "2026-09-30T15:00:00.000Z", campaignTime).buyerMarketplaceFeeRateBps, 2000);
  assert.equal(calculate(3000, eligibleCompanyCreatedAt, "2026-09-30T14:59:59.999Z").buyerMarketplaceFeeRateBps, 2000);
  assert.equal(calculate(3000, eligibleCompanyCreatedAt, "2027-09-30T14:59:59.999Z").buyerMarketplaceFeeRateBps, 500);
  assert.equal(calculate(3000, eligibleCompanyCreatedAt, "2027-09-30T15:00:00.000Z").buyerMarketplaceFeeRateBps, 2000);
  assert.equal(calculate(3000, null, campaignTime).buyerMarketplaceFeeRateBps, 2000);
  assert.equal(calculate(3000, "invalid", campaignTime).buyerMarketplaceFeeRateBps, 2000);
});

