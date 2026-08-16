export const CREATOR_LINK_INQUIRY_FORM_KINDS = ["simple", "pr"] as const;
export type CreatorLinkInquiryFormKind = (typeof CREATOR_LINK_INQUIRY_FORM_KINDS)[number];

export const REQUEST_MODES = ["pr_post", "ugc"] as const;
export type CreatorLinkRequestMode = (typeof REQUEST_MODES)[number];

export const PR_PROJECT_TYPES = [
  "visit_experience",
  "product_delivery",
  "provided_assets",
] as const;

export const REQUESTED_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "other",
] as const;

export const PLATFORM_DELIVERABLES = {
  instagram: ["feed_post", "reel", "stories", "live_stream", "other"],
  tiktok: ["short_video", "live_stream", "other"],
  x: ["standard_post", "thread_post", "video_post", "other"],
  youtube: ["short_video", "long_video", "live_stream", "other"],
  other: ["other"],
} as const;

export const UGC_DELIVERABLE_TYPES = ["photo_image", "video", "other"] as const;
export const UGC_USAGE_PURPOSES = [
  "paid_ads",
  "owned_social",
  "website_lp_ec",
  "digital_signage",
  "other",
] as const;
export const MEETING_METHODS = [
  "chat",
  "in_person",
  "online",
  "not_needed",
] as const;
export const CAMPAIGN_GOALS = [
  "awareness",
  "product_launch",
  "sales",
  "store_visit",
  "content_asset",
  "other",
] as const;
export const FREE_OFFER_OPTIONS = ["provided", "not_provided"] as const;
export const COMPANY_SOCIAL_PLATFORMS = ["instagram", "tiktok", "x", "youtube"] as const;

// 暫定版。正式な規約改定管理が導入されたら、この一箇所を更新する。
export { TERMS_VERSION, PRIVACY_VERSION } from "../legal/release";

export type PlatformDeliverable = {
  type: string;
  count: number;
  other_text?: string | null;
};

export type ConsentData = {
  accepted_at: string;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  truthful_information_confirmed: boolean;
  no_false_experience_request_confirmed: boolean;
  no_forced_positive_opinion_confirmed: boolean;
  account_activation_notice_accepted: boolean;
  platform_transaction_accepted: boolean;
  terms_version: string;
  privacy_version: string;
};

export type CreatorLinkRequestData = {
  request_mode?: CreatorLinkRequestMode;
  product_name?: string | null;
  product_url?: string | null;
  desired_timing?: string | null;
  budget_text?: string | null;
  has_free_offer?: boolean;
  free_offer_item?: string | null;
  free_offer_quantity?: string | null;
  free_offer_frequency?: string | null;
  free_offer_people?: string | null;
  free_offer_conditions?: string | null;
  company_website?: string | null;
  company_social_accounts?: Partial<Record<(typeof COMPANY_SOCIAL_PLATFORMS)[number], string>>;
  selling_points?: string | null;
  reference_url?: string | null;
  additional_notes?: string | null;
  consent_data?: ConsentData;
  ugc_deliverable_types?: string[];
  ugc_other_deliverable?: string | null;
  deliverable_count?: number | null;
  usage_purposes?: string[];
  usage_other?: string | null;
  meeting_method?: string | null;
  project_type?: string | null;
  requested_platforms?: string[];
  other_platform?: string | null;
  deliverables_by_platform?: Record<string, PlatformDeliverable[]>;
  campaign_goal?: string | null;
  campaign_goal_other?: string | null;
  // Legacy PR form keys retained for old inquiries.
  content_formats?: string[];
  usage_rights?: string | null;
  key_message?: string | null;
};

export const INQUIRY_FORM_DEFAULTS = {
  simple: {
    title: "お問い合わせ",
    description: "自由な内容で仕事の相談を受け付けます",
    sortOrder: 0,
  },
  pr: {
    title: "PR案件を依頼する",
    description: "PR投稿またはUGC制作の見積もりを依頼できます",
    sortOrder: 1,
  },
} as const;

export function isCreatorLinkInquiryFormKind(value: unknown): value is CreatorLinkInquiryFormKind {
  return typeof value === "string" &&
    (CREATOR_LINK_INQUIRY_FORM_KINDS as readonly string[]).includes(value);
}

export function cleanInquiryText(value: unknown, maxLength: number, required = false) {
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
    return { ok: false as const, error: `${maxLength}文字以内で入力してください。` };
  }
  return { ok: true as const, value: text };
}

export function isValidInquiryEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Aliases kept so older imports and old inquiry rendering remain compatible.
export const CREATOR_LINK_REQUESTED_PLATFORMS = REQUESTED_PLATFORMS;
export const CREATOR_LINK_OFFER_TYPES = ["provided", "not_provided", "consult"] as const;
export const CREATOR_LINK_PR_REQUEST_TYPES = ["pr_post", "ugc", "product_review", "visit_event", "other"] as const;
export const CREATOR_LINK_CONTENT_FORMATS = ["feed", "reel", "story", "short_video", "long_video", "photo", "live", "other"] as const;
export const CREATOR_LINK_CAMPAIGN_GOALS = CAMPAIGN_GOALS;
export const CREATOR_LINK_USAGE_RIGHTS = ["none", "organic", "paid_ads", "undecided"] as const;
export type CreatorLinkRequestedPlatform = (typeof REQUESTED_PLATFORMS)[number];
export type CreatorLinkOfferType = (typeof CREATOR_LINK_OFFER_TYPES)[number];
export type CreatorLinkContentFormat = (typeof CREATOR_LINK_CONTENT_FORMATS)[number];
export type CreatorLinkCampaignGoal = (typeof CAMPAIGN_GOALS)[number];
export type CreatorLinkUsageRights = (typeof CREATOR_LINK_USAGE_RIGHTS)[number];
