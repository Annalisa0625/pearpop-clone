export const CREATOR_LINK_INQUIRY_FORM_KINDS = ["simple", "pr"] as const;
export type CreatorLinkInquiryFormKind = (typeof CREATOR_LINK_INQUIRY_FORM_KINDS)[number];

export const CREATOR_LINK_REQUESTED_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "other",
] as const;
export type CreatorLinkRequestedPlatform =
  (typeof CREATOR_LINK_REQUESTED_PLATFORMS)[number];

export const CREATOR_LINK_OFFER_TYPES = [
  "provided",
  "not_provided",
  "consult",
] as const;
export type CreatorLinkOfferType = (typeof CREATOR_LINK_OFFER_TYPES)[number];

export const CREATOR_LINK_PR_REQUEST_TYPES = [
  "pr_post",
  "ugc",
  "product_review",
  "visit_event",
  "other",
] as const;

export const CREATOR_LINK_CONTENT_FORMATS = [
  "feed",
  "reel",
  "story",
  "short_video",
  "long_video",
  "photo",
  "live",
  "other",
] as const;
export type CreatorLinkContentFormat =
  (typeof CREATOR_LINK_CONTENT_FORMATS)[number];

export const CREATOR_LINK_CAMPAIGN_GOALS = [
  "awareness",
  "product_launch",
  "sales",
  "store_visit",
  "content_asset",
  "other",
] as const;
export type CreatorLinkCampaignGoal =
  (typeof CREATOR_LINK_CAMPAIGN_GOALS)[number];

export const CREATOR_LINK_USAGE_RIGHTS = [
  "none",
  "organic",
  "paid_ads",
  "undecided",
] as const;
export type CreatorLinkUsageRights =
  (typeof CREATOR_LINK_USAGE_RIGHTS)[number];

export type CreatorLinkRequestData = {
  campaign_goal: CreatorLinkCampaignGoal | null;
  content_formats: CreatorLinkContentFormat[];
  deliverable_count: number | null;
  usage_rights: CreatorLinkUsageRights | null;
  product_url: string | null;
  reference_url: string | null;
  key_message: string | null;
};

export const INQUIRY_FORM_DEFAULTS = {
  simple: {
    title: "お問い合わせ",
    description: "自由な内容で仕事の相談を受け付けます",
    sortOrder: 0,
  },
  pr: {
    title: "PR案件を依頼する",
    description: "PR案件に必要な情報をまとめて受け付けます",
    sortOrder: 1,
  },
} as const;

export function isCreatorLinkInquiryFormKind(
  value: unknown
): value is CreatorLinkInquiryFormKind {
  return (
    typeof value === "string" &&
    (CREATOR_LINK_INQUIRY_FORM_KINDS as readonly string[]).includes(value)
  );
}

export function cleanInquiryText(
  value: unknown,
  maxLength: number,
  required = false
) {
  if (typeof value !== "string") {
    return required
      ? { ok: false as const, error: "必須項目を入力してください。" }
      : { ok: true as const, value: null };
  }

  const text = value.trim();
  if (!text) {
    return required
      ? { ok: false as const, error: "必須項目を入力してください。" }
      : { ok: true as const, value: null };
  }
  if (text.length > maxLength) {
    return {
      ok: false as const,
      error: `${maxLength}文字以内で入力してください。`,
    };
  }
  return { ok: true as const, value: text };
}

export function isValidInquiryEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
