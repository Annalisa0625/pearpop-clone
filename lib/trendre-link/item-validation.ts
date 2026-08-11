import type { CreatorLinkButtonStyle } from "./constants";
import {
  CREATOR_LINK_SOCIAL_SERVICES,
  getCreatorLinkService,
  isCreatorLinkServiceKey,
  normalizeCreatorLinkServiceInput,
  type CreatorLinkServiceKey,
  type CreatorLinkSocialServiceKey,
} from "./service-registry";

export const CREATOR_LINK_SOCIAL_PLATFORMS = CREATOR_LINK_SOCIAL_SERVICES;
export type CreatorLinkSocialPlatform = CreatorLinkSocialServiceKey;

export const CREATOR_LINK_ITEM_LAYOUTS = ["wide", "square", "icon"] as const;
export const CREATOR_LINK_ITEM_SURFACES = ["filled", "outline"] as const;
export const CREATOR_LINK_ITEM_FINISHES = ["solid", "gradient", "metallic"] as const;
export const CREATOR_LINK_ITEM_DEPTHS = ["normal", "soft", "raised"] as const;
export const CREATOR_LINK_ITEM_SHAPES = ["rounded", "pill", "soft-square", "square"] as const;
export const CREATOR_LINK_ITEM_STYLES = ["solid", "outline", "glass", "soft", "shadow"] as const;
export const CREATOR_LINK_SOCIAL_STYLES = ["icons", "circle", "glass", "pill"] as const;
export const CREATOR_LINK_SOCIAL_SURFACES = ["none", "solid", "glass"] as const;
export const CREATOR_LINK_SOCIAL_SHAPES = ["icons", "circle", "pill"] as const;
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
export type CreatorLinkItemDepth = (typeof CREATOR_LINK_ITEM_DEPTHS)[number];
export type CreatorLinkItemShape = (typeof CREATOR_LINK_ITEM_SHAPES)[number];
export type CreatorLinkItemStyle = (typeof CREATOR_LINK_ITEM_STYLES)[number];
export type CreatorLinkSocialStyle = (typeof CREATOR_LINK_SOCIAL_STYLES)[number];
export type CreatorLinkSocialSurface = (typeof CREATOR_LINK_SOCIAL_SURFACES)[number];
export type CreatorLinkSocialShape = (typeof CREATOR_LINK_SOCIAL_SHAPES)[number];
export type CreatorLinkItemColor = (typeof CREATOR_LINK_ITEM_COLORS)[number];

export type CreatorLinkItemAppearance = {
  layout: CreatorLinkItemLayout;
  surface: CreatorLinkItemSurface;
  finish: CreatorLinkItemFinish;
  color: CreatorLinkItemColor;
  depth?: CreatorLinkItemDepth;
  iconColor?: string | null;
  shape?: CreatorLinkItemShape;
  style?: CreatorLinkItemStyle;
  socialStyle?: CreatorLinkSocialStyle;
  socialSurface?: CreatorLinkSocialSurface;
  socialShape?: CreatorLinkSocialShape;
  surfaceColor?: string | null;
  borderColor?: string | null;
  serviceKey?: CreatorLinkServiceKey;
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
  depth: "normal",
};

export function getCreatorLinkItemColors(finish: CreatorLinkItemFinish): readonly CreatorLinkItemColor[] {
  if (finish === "gradient") return CREATOR_LINK_ITEM_GRADIENT_COLORS;
  if (finish === "metallic") return CREATOR_LINK_ITEM_METALLIC_COLORS;
  return CREATOR_LINK_ITEM_SOLID_COLORS;
}

export function getCreatorLinkItemFinishForColor(color: CreatorLinkItemColor): CreatorLinkItemFinish {
  if ((CREATOR_LINK_ITEM_GRADIENT_COLORS as readonly string[]).includes(color)) return "gradient";
  if ((CREATOR_LINK_ITEM_METALLIC_COLORS as readonly string[]).includes(color)) return "metallic";
  return "solid";
}

export function applyCreatorLinkItemStyle(value: CreatorLinkItemAppearance, style: CreatorLinkItemStyle): CreatorLinkItemAppearance {
  if (style === "outline") return { ...value, style, surface: "outline", depth: "normal" };
  if (style === "soft") return { ...value, style, surface: "filled", depth: "soft" };
  if (style === "shadow") return { ...value, style, surface: "filled", depth: "raised" };
  return { ...value, style, surface: "filled", depth: "normal" };
}

export function resolveCreatorLinkItemShape(value: CreatorLinkItemAppearance, pageButtonStyle: CreatorLinkButtonStyle): CreatorLinkItemShape {
  if (value.shape) return value.shape;
  if (pageButtonStyle === "pill") return "pill";
  if (pageButtonStyle === "square") return "soft-square";
  return "rounded";
}

export function resolveCreatorLinkItemStyle(value: CreatorLinkItemAppearance, pageButtonStyle: CreatorLinkButtonStyle): CreatorLinkItemStyle {
  if (value.style) return value.style;
  if (pageButtonStyle === "glass") return "glass";
  if (value.surface === "outline") return "outline";
  if ((value.depth ?? "normal") === "raised") return "shadow";
  if ((value.depth ?? "normal") === "soft") return "soft";
  return "solid";
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
  const depth = isOneOf(CREATOR_LINK_ITEM_DEPTHS, record.depth) ? record.depth : "normal";
  const shape = isOneOf(CREATOR_LINK_ITEM_SHAPES, record.shape) ? record.shape : undefined;
  const style = isOneOf(CREATOR_LINK_ITEM_STYLES, record.style) ? record.style : undefined;
  const socialStyle = isOneOf(CREATOR_LINK_SOCIAL_STYLES, record.socialStyle) ? record.socialStyle : undefined;
  const socialSurface = isOneOf(CREATOR_LINK_SOCIAL_SURFACES, record.socialSurface) ? record.socialSurface : undefined;
  const socialShape = isOneOf(CREATOR_LINK_SOCIAL_SHAPES, record.socialShape) ? record.socialShape : undefined;
  if (!isOneOf(CREATOR_LINK_ITEM_LAYOUTS, record.layout)
    || !isOneOf(CREATOR_LINK_ITEM_SURFACES, record.surface)
    || !isColorForFinish(finish, record.color)) {
    return { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE };
  }
  const iconColor = record.iconColor === null || (typeof record.iconColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.iconColor))
    ? typeof record.iconColor === "string" ? record.iconColor.toUpperCase() : null
    : undefined;
  const surfaceColor = record.surfaceColor === null ? null : typeof record.surfaceColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.surfaceColor) ? record.surfaceColor.toUpperCase() : undefined;
  const borderColor = record.borderColor === null ? null : typeof record.borderColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.borderColor) ? record.borderColor.toUpperCase() : undefined;
  const serviceKey = isCreatorLinkServiceKey(record.serviceKey) ? record.serviceKey : undefined;
  return { ...record, layout: record.layout, surface: record.surface, finish, color: record.color, depth, ...(iconColor === undefined ? {} : { iconColor }), ...(shape ? { shape } : {}), ...(style ? { style } : {}), ...(socialStyle ? { socialStyle } : {}), ...(socialSurface ? { socialSurface } : {}), ...(socialShape ? { socialShape } : {}), ...(surfaceColor === undefined ? {} : { surfaceColor }), ...(borderColor === undefined ? {} : { borderColor }), ...(serviceKey ? { serviceKey } : {}) } as CreatorLinkItemAppearance;
}

export function validateCreatorLinkItemAppearance(value: unknown): ValidationResult<CreatorLinkItemAppearance> {
  if (value === undefined) return { ok: true, value: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE } };
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "カードデザインの形式が正しくありません。" };
  }
  const record = value as Record<string, unknown>;
  const finish = isOneOf(CREATOR_LINK_ITEM_FINISHES, record.finish) ? record.finish : "solid";
  const depth = record.depth === undefined ? "normal" : isOneOf(CREATOR_LINK_ITEM_DEPTHS, record.depth) ? record.depth : null;
  const shape = record.shape === undefined ? undefined : isOneOf(CREATOR_LINK_ITEM_SHAPES, record.shape) ? record.shape : null;
  const style = record.style === undefined ? undefined : isOneOf(CREATOR_LINK_ITEM_STYLES, record.style) ? record.style : null;
  const socialStyle = record.socialStyle === undefined ? undefined : isOneOf(CREATOR_LINK_SOCIAL_STYLES, record.socialStyle) ? record.socialStyle : null;
  const socialSurface = record.socialSurface === undefined ? undefined : isOneOf(CREATOR_LINK_SOCIAL_SURFACES, record.socialSurface) ? record.socialSurface : null;
  const socialShape = record.socialShape === undefined ? undefined : isOneOf(CREATOR_LINK_SOCIAL_SHAPES, record.socialShape) ? record.socialShape : null;
  if (!isOneOf(CREATOR_LINK_ITEM_LAYOUTS, record.layout)
    || !isOneOf(CREATOR_LINK_ITEM_SURFACES, record.surface)
    || !isColorForFinish(finish, record.color)
    || depth === null
    || shape === null
    || style === null
    || socialStyle === null
    || socialSurface === null
    || socialShape === null) {
    return { ok: false, error: "カードデザインの指定が正しくありません。" };
  }
  if (!(record.iconColor === undefined || record.iconColor === null || (typeof record.iconColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.iconColor)))) {
    return { ok: false, error: "アイコンカラーの形式が正しくありません。" };
  }
  if (!(record.surfaceColor === undefined || record.surfaceColor === null || (typeof record.surfaceColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.surfaceColor)))) {
    return { ok: false, error: "Social surface color must be a six-digit hex color." };
  }
  if (!(record.borderColor === undefined || record.borderColor === null || (typeof record.borderColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(record.borderColor)))) {
    return { ok: false, error: "Social border color must be a six-digit hex color." };
  }
  if (!(record.serviceKey === undefined || isCreatorLinkServiceKey(record.serviceKey))) {
    return { ok: false, error: "Link service is not supported." };
  }
  return { ok: true, value: { ...record, layout: record.layout, surface: record.surface, finish, color: record.color, depth, ...(record.iconColor === undefined ? {} : { iconColor: typeof record.iconColor === "string" ? record.iconColor.toUpperCase() : null }), ...(shape ? { shape } : {}), ...(style ? { style } : {}), ...(socialStyle ? { socialStyle } : {}), ...(socialSurface ? { socialSurface } : {}), ...(socialShape ? { socialShape } : {}), ...(record.surfaceColor === undefined ? {} : { surfaceColor: typeof record.surfaceColor === "string" ? record.surfaceColor.toUpperCase() : null }), ...(record.borderColor === undefined ? {} : { borderColor: typeof record.borderColor === "string" ? record.borderColor.toUpperCase() : null }), ...(isCreatorLinkServiceKey(record.serviceKey) ? { serviceKey: record.serviceKey } : {}) } as CreatorLinkItemAppearance };
}

export type CreatorLinkResolvedSocialAppearance = {
  shape: CreatorLinkSocialShape;
  iconColor: string | null | undefined;
  surfaceColor: string | null;
  borderColor: string | null;
};

export function resolveCreatorLinkSocialAppearance(value: CreatorLinkItemAppearance): CreatorLinkResolvedSocialAppearance | null {
  const appearance = normalizeCreatorLinkItemAppearance(value);
  if (!appearance.socialShape) return null;
  if (appearance.socialShape === "icons") return { shape: "icons", iconColor: appearance.iconColor, surfaceColor: null, borderColor: null };
  return {
    shape: appearance.socialShape,
    iconColor: appearance.iconColor,
    surfaceColor: appearance.surfaceColor ?? null,
    borderColor: appearance.borderColor ?? null,
  };
}

export type CreatorLinkSocialRenderStyle = {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: "solid";
  borderWidth?: "0px" | "1px";
};

export function getCreatorLinkSocialRenderStyle(value: CreatorLinkResolvedSocialAppearance): CreatorLinkSocialRenderStyle {
  if (value.shape === "icons") return { color: value.iconColor ?? undefined };
  return {
    color: value.iconColor ?? undefined,
    backgroundColor: value.surfaceColor ?? "transparent",
    borderColor: value.borderColor ?? "transparent",
    borderStyle: "solid",
    borderWidth: value.borderColor === null ? "0px" : "1px",
  };
}

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

export function normalizeSocialProfile(platform: CreatorLinkSocialPlatform, rawInput: string): ValidationResult<{ url: string; title: string }> {
  const serviceResult = normalizeCreatorLinkServiceInput(platform, rawInput);
  if (!serviceResult.ok) return serviceResult;
  return { ok: true, value: { url: serviceResult.value.url, title: getCreatorLinkService(platform).labelEn } };
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
