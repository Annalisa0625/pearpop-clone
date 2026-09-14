import {
  isCreatorCountry,
  type CreatorCountry,
} from "./country";

export type CreatorMarketplaceAvailability = {
  paidMarketplaceEnabled: boolean;
};

const CREATOR_MARKETPLACE_AVAILABILITY = {
  日本: { paidMarketplaceEnabled: true },
  韓国: { paidMarketplaceEnabled: false },
  台湾: { paidMarketplaceEnabled: false },
} as const satisfies Record<CreatorCountry, CreatorMarketplaceAvailability>;

const PAID_MARKETPLACE_DISABLED: CreatorMarketplaceAvailability = {
  paidMarketplaceEnabled: false,
};

export function getCreatorMarketplaceAvailability(
  country: unknown,
): CreatorMarketplaceAvailability {
  return isCreatorCountry(country)
    ? CREATOR_MARKETPLACE_AVAILABILITY[country]
    : PAID_MARKETPLACE_DISABLED;
}

export function isCreatorPaidMarketplaceEnabled(country: unknown): boolean {
  return getCreatorMarketplaceAvailability(country).paidMarketplaceEnabled;
}

export function shouldIncludeCreatorInCompanyDirectory(
  country: unknown,
  payoutReady: boolean,
  activeMenuCount: number,
): boolean {
  if (!isCreatorCountry(country)) return false;
  return !isCreatorPaidMarketplaceEnabled(country) ||
    (payoutReady && activeMenuCount > 0);
}
