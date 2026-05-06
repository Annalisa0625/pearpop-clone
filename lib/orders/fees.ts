// File: lib/orders/fees.ts

export type InternalCompanyPlanCode = "free" | "standard" | "global_pro";

export type PublicCompanyPlanName = "basic" | "pro" | "premium";

export const CREATOR_TRANSACTION_FEE_BPS = 1500;
export const DEFAULT_BUYER_MARKETPLACE_FEE_BPS = 1000;

export function normalizeInternalPlanCode(
  value: string | null | undefined
): InternalCompanyPlanCode {
  if (value === "standard" || value === "global_pro") {
    return value;
  }

  return "free";
}

export function toPublicPlanName(
  planCode: string | null | undefined
): PublicCompanyPlanName {
  const normalized = normalizeInternalPlanCode(planCode);

  if (normalized === "standard") return "pro";
  if (normalized === "global_pro") return "premium";

  return "basic";
}

export function getBuyerMarketplaceFeeBps(
  planCode: string | null | undefined
) {
  const normalized = normalizeInternalPlanCode(planCode);

  // Collabstr寄せの初期方針:
  // Basic / Pro は 10%、Premium は 5%。
  if (normalized === "global_pro") {
    return 500;
  }

  return 1000;
}

export function getCreatorTransactionFeeBps() {
  return CREATOR_TRANSACTION_FEE_BPS;
}

export function calculateOrderFees(args: {
  menuPriceAmount: number;
  buyerPlanCode: string | null | undefined;
}) {
  const menuPriceAmount = Math.max(0, Math.round(args.menuPriceAmount));
  const buyerMarketplaceFeeRateBps = getBuyerMarketplaceFeeBps(
    args.buyerPlanCode
  );
  const creatorTransactionFeeRateBps = getCreatorTransactionFeeBps();

  const buyerMarketplaceFeeAmount = Math.floor(
    (menuPriceAmount * buyerMarketplaceFeeRateBps) / 10000
  );

  const creatorTransactionFeeAmount = Math.floor(
    (menuPriceAmount * creatorTransactionFeeRateBps) / 10000
  );

  const buyerTotalAmount = menuPriceAmount + buyerMarketplaceFeeAmount;
  const creatorPayoutAmount = menuPriceAmount - creatorTransactionFeeAmount;
  const platformGrossRevenueAmount =
    buyerMarketplaceFeeAmount + creatorTransactionFeeAmount;

  return {
    menuPriceAmount,
    buyerPlanCodeSnapshot: normalizeInternalPlanCode(args.buyerPlanCode),
    buyerPlanPublicNameSnapshot: toPublicPlanName(args.buyerPlanCode),
    buyerMarketplaceFeeRateBps,
    buyerMarketplaceFeeAmount,
    creatorTransactionFeeRateBps,
    creatorTransactionFeeAmount,
    buyerTotalAmount,
    creatorPayoutAmount,
    platformGrossRevenueAmount,
  };
}
