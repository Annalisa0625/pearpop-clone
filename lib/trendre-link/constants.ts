export const CREATOR_LINK_THEMES = [
  "night-purple",
  "soft-ivory",
  "minimal-black",
  "natural-beige",
] as const;

export const CREATOR_LINK_STATUSES = ["draft", "published", "private"] as const;
export const CREATOR_LINK_BUTTON_STYLES = ["rounded", "pill", "square", "glass"] as const;
export const CREATOR_LINK_FONT_STYLES = ["modern", "soft", "serif", "bold"] as const;

export const CREATOR_LINK_ITEM_TYPES = [
  "social",
  "link",
  "text",
  "image",
  "portfolio",
  "heading",
] as const;

export const CREATOR_LINK_INQUIRY_TEMPLATES = [
  "pr_post",
  "product_review",
  "ugc",
  "visit_event",
  "event_appearance",
  "model",
  "live_tieup",
  "music_video",
  "other",
] as const;

export const RESERVED_CREATOR_LINK_SLUGS = [
  "admin",
  "api",
  "login",
  "logout",
  "signup",
  "creator",
  "creators",
  "company",
  "companies",
  "dashboard",
  "home",
  "privacy",
  "terms",
  "legal",
  "for-creators",
  "for-companies",
  "notifications",
  "settings",
  "support",
  "help",
  "my",
  "b",
  "in",
  "link",
  "trendre",
  "trend-mart",
] as const;

export type CreatorLinkTheme = (typeof CREATOR_LINK_THEMES)[number];
export type CreatorLinkStatus = (typeof CREATOR_LINK_STATUSES)[number];
export type CreatorLinkButtonStyle = (typeof CREATOR_LINK_BUTTON_STYLES)[number];
export type CreatorLinkFontStyle = (typeof CREATOR_LINK_FONT_STYLES)[number];
export type CreatorLinkItemType = (typeof CREATOR_LINK_ITEM_TYPES)[number];
export type CreatorLinkInquiryTemplate =
  (typeof CREATOR_LINK_INQUIRY_TEMPLATES)[number];

function includesValue(values: readonly string[], value: string): boolean {
  return values.includes(value);
}

export function isCreatorLinkTheme(value: string): value is CreatorLinkTheme {
  return includesValue(CREATOR_LINK_THEMES, value);
}

export function isCreatorLinkStatus(value: string): value is CreatorLinkStatus {
  return includesValue(CREATOR_LINK_STATUSES, value);
}

export function isCreatorLinkButtonStyle(value: string): value is CreatorLinkButtonStyle {
  return includesValue(CREATOR_LINK_BUTTON_STYLES, value);
}

export function isCreatorLinkFontStyle(value: string): value is CreatorLinkFontStyle {
  return includesValue(CREATOR_LINK_FONT_STYLES, value);
}

export function isCreatorLinkItemType(value: string): value is CreatorLinkItemType {
  return includesValue(CREATOR_LINK_ITEM_TYPES, value);
}

export function isCreatorLinkInquiryTemplate(
  value: string
): value is CreatorLinkInquiryTemplate {
  return includesValue(CREATOR_LINK_INQUIRY_TEMPLATES, value);
}
