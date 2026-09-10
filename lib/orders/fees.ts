// File: lib/orders/fees.ts

export type InternalCompanyPlanCode = "free" | "standard" | "global_pro";

export type PublicCompanyPlanName = "basic" | "pro" | "premium";

export const CREATOR_TRANSACTION_FEE_BPS = 1500;
export const DEFAULT_BUYER_MARKETPLACE_FEE_BPS = 2000;
export const EARLY_COMPANY_BUYER_MARKETPLACE_FEE_BPS = 500;

export const EARLY_COMPANY_PREREGISTRATION_CUTOFF =
  "2026-09-30T14:59:59.999Z";
export const EARLY_COMPANY_CAMPAIGN_START = "2026-09-30T15:00:00.000Z";
export const EARLY_COMPANY_CAMPAIGN_END = "2027-09-30T15:00:00.000Z";

type FeeCalculationTime = string | number | Date | null | undefined;

function toEpochMilliseconds(value: FeeCalculationTime) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return Number.NaN;
}

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
  _planCode: string | null | undefined,
  buyerCompanyCreatedAt?: FeeCalculationTime,
  calculatedAt: FeeCalculationTime = new Date()
) {
  const companyCreatedAt = toEpochMilliseconds(buyerCompanyCreatedAt);
  const orderTime = toEpochMilliseconds(calculatedAt);
  const preregistrationCutoff = Date.parse(EARLY_COMPANY_PREREGISTRATION_CUTOFF);
  const campaignStart = Date.parse(EARLY_COMPANY_CAMPAIGN_START);
  const campaignEnd = Date.parse(EARLY_COMPANY_CAMPAIGN_END);

  if (
    Number.isFinite(companyCreatedAt) &&
    Number.isFinite(orderTime) &&
    companyCreatedAt <= preregistrationCutoff &&
    campaignStart <= orderTime &&
    orderTime < campaignEnd
  ) {
    return EARLY_COMPANY_BUYER_MARKETPLACE_FEE_BPS;
  }

  return DEFAULT_BUYER_MARKETPLACE_FEE_BPS;
}

export function getCreatorTransactionFeeBps() {
  return CREATOR_TRANSACTION_FEE_BPS;
}

export function calculateOrderFees(args: {
  menuPriceAmount: number;
  buyerPlanCode: string | null | undefined;
  buyerCompanyCreatedAt?: FeeCalculationTime;
  calculatedAt?: FeeCalculationTime;
}) {
  const menuPriceAmount = Math.max(0, Math.round(args.menuPriceAmount));
  const buyerMarketplaceFeeRateBps = getBuyerMarketplaceFeeBps(
    args.buyerPlanCode,
    args.buyerCompanyCreatedAt,
    args.calculatedAt
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
