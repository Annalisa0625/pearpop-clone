export const CREATOR_LINK_SOCIAL_PLATFORMS = ["instagram", "tiktok", "x", "youtube"] as const;
export type CreatorLinkSocialPlatform = (typeof CREATOR_LINK_SOCIAL_PLATFORMS)[number];

export const CREATOR_LINK_ITEM_LAYOUTS = ["wide", "square", "icon"] as const;
export const CREATOR_LINK_ITEM_SURFACES = ["filled", "outline"] as const;
export const CREATOR_LINK_ITEM_FINISHES = ["solid", "gradient", "metallic"] as const;
export const CREATOR_LINK_ITEM_SOLID_COLORS = [
  "charcoal", "white", "sand", "brown", "rose", "pink", "red", "orange", "green", "blue",
] as const;
export const CREATOR_LINK_ITEM_GRADIENT_COLORS = ["sunset", "aurora", "ocean", "berry", "emerald", "champagne"] as const;
export const CREATOR_LINK_ITEM_METALLIC_COLORS = ["champagne-gold", "rose-gold", "silver", "titanium", "graphite"] as const;
export const CREATOR_LINK_ITEM_COLORS = [
  ...CREATOR_LINK_ITEM_SOLID_COLORS,
  ...CREATOR_LINK_ITEM_GRADIENT_COLORS,
  ...CREATOR_LINK_ITEM_METALLIC_COLORS,
] as const;

export type CreatorLinkItemLayout = (typeof CREATOR_LINK_ITEM_LAYOUTS)[number];
export type CreatorLinkItemSurface = (typeof CREATOR_LINK_ITEM_SURFACES)[number];
export type CreatorLinkItemFinish = (typeof CREATOR_LINK_ITEM_FINISHES)[number];
export type CreatorLinkItemColor = (typeof CREATOR_LINK_ITEM_COLORS)[number];

export type CreatorLinkItemAppearance = {
  layout: CreatorLinkItemLayout;
  surface: CreatorLinkItemSurface;
  finish: CreatorLinkItemFinish;
  color: CreatorLinkItemColor;
};

export const CREATOR_LINK_ITEM_COLOR_VALUES: Record<CreatorLinkItemColor, string> = {
  charcoal: "#29272A",
  white: "#FAF9F7",
  sand: "#D5C4AA",
  brown: "#806B57",
  rose: "#E9A6B5",
  pink: "#F35C83",
  red: "#D95C5C",
  orange: "#E59A55",
  green: "#5D9D7B",
  blue: "#6286C5",
  sunset: "linear-gradient(135deg, #F4A0B6 0%, #EE8D70 52%, #E9A15E 100%)",
  aurora: "linear-gradient(135deg, #9A78D2 0%, #677FD4 58%, #69B8C5 100%)",
  ocean: "linear-gradient(135deg, #285C9E 0%, #328BC2 55%, #54C7CE 100%)",
  berry: "linear-gradient(135deg, #7C294B 0%, #74305F 48%, #4D2A78 100%)",
  emerald: "linear-gradient(135deg, #174F43 0%, #237968 56%, #273F3C 100%)",
  champagne: "linear-gradient(135deg, #F7F0DF 0%, #DCC395 52%, #FFF9EC 100%)",
  "champagne-gold": "linear-gradient(135deg, #B8985E 0%, #F4E5B8 38%, #C7A86A 62%, #FFF3CF 100%)",
  "rose-gold": "linear-gradient(135deg, #9F695F 0%, #E6B9AA 40%, #B87870 65%, #F0D0C1 100%)",
  silver: "linear-gradient(135deg, #AEB2B7 0%, #F4F5F6 38%, #8E959D 63%, #D9DDE0 100%)",
  titanium: "linear-gradient(135deg, #3F4851 0%, #87919B 40%, #4D5965 65%, #AAB1B7 100%)",
  graphite: "linear-gradient(135deg, #202124 0%, #5B5E63 42%, #2A2C30 68%, #767A80 100%)",
};

export const DEFAULT_CREATOR_LINK_ITEM_APPEARANCE: CreatorLinkItemAppearance = {
  layout: "wide",
  surface: "filled",
  finish: "solid",
  color: "charcoal",
};

export function getCreatorLinkItemColors(finish: CreatorLinkItemFinish): readonly CreatorLinkItemColor[] {
  if (finish === "gradient") return CREATOR_LINK_ITEM_GRADIENT_COLORS;
  if (finish === "metallic") return CREATOR_LINK_ITEM_METALLIC_COLORS;
  return CREATOR_LINK_ITEM_SOLID_COLORS;
}

function isColorForFinish(finish: CreatorLinkItemFinish, color: unknown): color is CreatorLinkItemColor {
  return isOneOf(getCreatorLinkItemColors(finish), color);
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isOneOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function normalizeCreatorLinkItemAppearance(value: unknown): CreatorLinkItemAppearance {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
  }
  const record = value as Record<string, unknown>;
  const finish = isOneOf(CREATOR_LINK_ITEM_FINISHES, record.finish) ? record.finish : "solid";
  if (!isOneOf(CREATOR_LINK_ITEM_LAYOUTS, record.layout)
    || !isOneOf(CREATOR_LINK_ITEM_SURFACES, record.surface)
    || !isColorForFinish(finish, record.color)) {
    return { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
  }
  return { layout: record.layout, surface: record.surface, finish, color: record.color };
}

export function validateCreatorLinkItemAppearance(value: unknown): ValidationResult<CreatorLinkItemAppearance> {
  if (value === undefined) return { ok: true, value: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE } };
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "カードデザインの形式が正しくありません。" };
  }
  const record = value as Record<string, unknown>;
  const finish = isOneOf(CREATOR_LINK_ITEM_FINISHES, record.finish) ? record.finish : "solid";
  if (!isOneOf(CREATOR_LINK_ITEM_LAYOUTS, record.layout)
    || !isOneOf(CREATOR_LINK_ITEM_SURFACES, record.surface)
    || !isColorForFinish(finish, record.color)) {
    return { ok: false, error: "カードデザインの指定が正しくありません。" };
  }
  return { ok: true, value: { layout: record.layout, surface: record.surface, finish, color: record.color } };
}

const SOCIAL_LABELS: Record<CreatorLinkSocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
};

export function isCreatorLinkSocialPlatform(value: string): value is CreatorLinkSocialPlatform {
  return (CREATOR_LINK_SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function cleanUsername(value: string): string {
  return value.trim().replace(/^@/, "").replace(/^\/+|\/+$/g, "");
}

function firstPathPart(url: URL): string {
  const value = url.pathname.split("/").filter(Boolean)[0] ?? "";
  try { return decodeURIComponent(value); } catch { return ""; }
}

export function normalizeSocialProfile(platform: CreatorLinkSocialPlatform, rawInput: string): ValidationResult<{ url: string; title: string }> {
  const input = rawInput.trim();
  if (!input || input.length > 500) return { ok: false, error: "SNSアカウントを入力してください。" };

  const parsed = parseHttpUrl(input);
  let username = "";
  if (parsed) {
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (platform === "instagram") {
      if (host !== "instagram.com") return { ok: false, error: "InstagramのURLを入力してください。" };
      username = firstPathPart(parsed);
    } else if (platform === "tiktok") {
      if (host !== "tiktok.com") return { ok: false, error: "TikTokのURLを入力してください。" };
      username = cleanUsername(firstPathPart(parsed));
    } else if (platform === "x") {
      if (host !== "x.com" && host !== "twitter.com") return { ok: false, error: "XのURLを入力してください。" };
      username = firstPathPart(parsed);
    } else {
      if (host !== "youtube.com" && host !== "m.youtube.com") return { ok: false, error: "YouTubeのURLを入力してください。" };
      const parts = parsed.pathname.split("/").filter(Boolean);
      const first = parts[0] ?? "";
      if (first.startsWith("@")) username = cleanUsername(first);
      else if (["channel", "c", "user"].includes(first) && parts[1]) {
        return { ok: true, value: { url: `https://www.youtube.com/${first}/${encodeURIComponent(parts[1])}`, title: SOCIAL_LABELS[platform] } };
      } else return { ok: false, error: "YouTubeのチャンネルURLまたはhandleを入力してください。" };
    }
  } else username = cleanUsername(input);

  const patterns: Record<CreatorLinkSocialPlatform, RegExp> = {
    instagram: /^[A-Za-z0-9._]{1,30}$/,
    tiktok: /^[A-Za-z0-9._]{2,50}$/,
    x: /^[A-Za-z0-9_]{1,15}$/,
    youtube: /^[A-Za-z0-9._-]{3,100}$/,
  };
  if (!patterns[platform].test(username)) return { ok: false, error: `${SOCIAL_LABELS[platform]}のユーザー名が正しくありません。` };

  const encoded = encodeURIComponent(username);
  const url = platform === "instagram"
    ? `https://www.instagram.com/${encoded}/`
    : platform === "tiktok"
      ? `https://www.tiktok.com/@${encoded}`
      : platform === "x"
        ? `https://x.com/${encoded}`
        : `https://www.youtube.com/@${encoded}`;
  return { ok: true, value: { url, title: SOCIAL_LABELS[platform] } };
}

export function validateGeneralLink(values: { title: string; url: string }): ValidationResult<{ title: string; url: string; description: null }> {
  const title = values.title.trim();
  const urlInput = values.url.trim();
  if (!title) return { ok: false, error: "リンク名を入力してください。" };
  if (title.length > 80) return { ok: false, error: "リンク名は80文字以内で入力してください。" };
  if (!urlInput || urlInput.length > 500) return { ok: false, error: "URLは500文字以内で入力してください。" };
  const parsed = parseHttpUrl(urlInput);
  if (!parsed) return { ok: false, error: "httpまたはhttpsのURLを入力してください。" };
  return { ok: true, value: { title, url: parsed.toString(), description: null } };
}
