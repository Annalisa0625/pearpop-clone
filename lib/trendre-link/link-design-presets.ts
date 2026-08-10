import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";
import { CREATOR_LINK_BACKGROUND_PRESETS, findCreatorLinkBackgroundPreset, type CreatorLinkBackgroundPreset } from "./background-presets";
import { normalizeCreatorLinkItemAppearance, type CreatorLinkItemAppearance } from "./item-validation";

export const LINK_DESIGN_PRESET_CATEGORIES = ["normal", "gradient", "metal", "animal", "pattern", "emotion", "pretty", "nature", "city"] as const;
export type LinkDesignPresetCategory = (typeof LINK_DESIGN_PRESET_CATEGORIES)[number];
export type CreatorLinkPresetCategory = LinkDesignPresetCategory;
export type LinkDesignPreset = { id: string; name: string; category: LinkDesignPresetCategory; tags?: readonly string[]; description: string; backgroundId: string; page: { themeKey: CreatorLinkTheme; accentColor: string; displayNameColor: string; fontStyle: CreatorLinkFontStyle; buttonStyle: CreatorLinkButtonStyle }; socialIconColor: string | null; linkAppearance: CreatorLinkItemAppearance };
/** @deprecated Compatibility shape for existing onboarding imports. Use LinkDesignPreset. */
export type CreatorLinkOnboardingPreset = LinkDesignPreset & { backgroundPresetKey: string };

const wide = (surface: "filled" | "outline", finish: "solid" | "gradient" | "metallic", color: CreatorLinkItemAppearance["color"], depth: "normal" | "soft" | "raised"): CreatorLinkItemAppearance => ({ layout: "wide", surface, finish, color, depth });

export const LINK_DESIGN_PRESETS: readonly LinkDesignPreset[] = [
  { id: "studio", name: "Studio", category: "normal", tags: ["white", "clean"], description: "Crisp editorial white", backgroundId: "snow", page: { themeKey: "soft-ivory", accentColor: "#F4F5F7", displayNameColor: "#29272A", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#29272A", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "noir", name: "Noir", category: "normal", tags: ["black", "charcoal"], description: "High contrast runway", backgroundId: "midnight", page: { themeKey: "minimal-black", accentColor: "#18171B", displayNameColor: "#FAF9F7", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#FAF9F7", linkAppearance: wide("filled", "solid", "white", "raised") },
  { id: "linen", name: "Linen", category: "normal", tags: ["ivory", "beige"], description: "Warm paper and cocoa", backgroundId: "ivory", page: { themeKey: "natural-beige", accentColor: "#F7EFE1", displayNameColor: "#594A3F", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#806B57", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "blush", name: "Blush", category: "normal", tags: ["pink", "soft"], description: "Quiet blush pink", backgroundId: "blush", page: { themeKey: "soft-ivory", accentColor: "#F2D8DC", displayNameColor: "#663E49", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#8E5260", linkAppearance: wide("filled", "solid", "rose", "soft") },
  { id: "blue-note", name: "Blue Note", category: "normal", tags: ["blue", "clean"], description: "Clear powder blue", backgroundId: "sky", page: { themeKey: "soft-ivory", accentColor: "#C9DDF0", displayNameColor: "#27435E", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#355E82", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "lavender", name: "Lavender", category: "normal", tags: ["purple", "soft"], description: "Calm lavender wash", backgroundId: "lavender", page: { themeKey: "night-purple", accentColor: "#CFC7EA", displayNameColor: "#403A5A", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#554C78", linkAppearance: wide("outline", "solid", "charcoal", "soft") },
  { id: "sage-clean", name: "Sage Clean", category: "normal", tags: ["green", "sage"], description: "Clean muted sage", backgroundId: "mint", page: { themeKey: "natural-beige", accentColor: "#C8E0D2", displayNameColor: "#345044", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#456B59", linkAppearance: wide("filled", "solid", "green", "soft") },
  { id: "mocha", name: "Mocha", category: "normal", tags: ["brown", "warm"], description: "Grounded warm mocha", backgroundId: "mocha", page: { themeKey: "natural-beige", accentColor: "#806B57", displayNameColor: "#FFF7EC", fontStyle: "serif", buttonStyle: "square" }, socialIconColor: "#FFF7EC", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "stone", name: "Stone", category: "normal", tags: ["gray", "neutral"], description: "Balanced warm gray", backgroundId: "stone-gray", page: { themeKey: "soft-ivory", accentColor: "#D6D3D1", displayNameColor: "#34312F", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#4B4744", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "garnet", name: "Garnet", category: "normal", tags: ["red", "deep"], description: "Refined muted red", backgroundId: "garnet", page: { themeKey: "minimal-black", accentColor: "#B54C58", displayNameColor: "#FFF8F4", fontStyle: "bold", buttonStyle: "rounded" }, socialIconColor: "#FFF8F4", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "terracotta", name: "Terracotta", category: "normal", tags: ["orange", "warm"], description: "Warm editorial orange", backgroundId: "terracotta", page: { themeKey: "natural-beige", accentColor: "#D4815F", displayNameColor: "#3B271F", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#4F3025", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "butter", name: "Butter", category: "normal", tags: ["yellow", "soft"], description: "Soft golden yellow", backgroundId: "butter", page: { themeKey: "natural-beige", accentColor: "#E6CB78", displayNameColor: "#40371E", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#544925", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "bloom", name: "Bloom", category: "gradient", tags: ["pink", "peach"], description: "Peach rose daydream", backgroundId: "peach-rose", page: { themeKey: "soft-ivory", accentColor: "#E78D91", displayNameColor: "#66283F", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#A52F61", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "aurora", name: "Aurora", category: "gradient", tags: ["purple", "blue"], description: "Purple cyan energy", backgroundId: "aurora", page: { themeKey: "night-purple", accentColor: "#786FD6", displayNameColor: "#FAF9F7", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#FFFFFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "velvet", name: "Velvet", category: "gradient", description: "Indigo editorial glow", backgroundId: "indigo-bloom", page: { themeKey: "night-purple", accentColor: "#5749B8", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "tidal", name: "Tidal", category: "gradient", tags: ["blue", "aqua"], description: "Mint aqua motion", backgroundId: "aqua-mint", page: { themeKey: "natural-beige", accentColor: "#51BFAE", displayNameColor: "#153E43", fontStyle: "soft", buttonStyle: "glass" }, socialIconColor: "#164C51", linkAppearance: wide("outline", "solid", "charcoal", "soft") },
  { id: "gold", name: "Gold", category: "metal", tags: ["gold", "luxury"], description: "Readable champagne metal", backgroundId: "champagne-gold", page: { themeKey: "natural-beige", accentColor: "#C8A86B", displayNameColor: "#3E3220", fontStyle: "serif", buttonStyle: "glass" }, socialIconColor: "#4B3B25", linkAppearance: wide("filled", "metallic", "champagne-gold", "raised") },
  { id: "chrome", name: "Chrome", category: "metal", tags: ["silver", "metal"], description: "Polished future metal", backgroundId: "brushed-silver", page: { themeKey: "minimal-black", accentColor: "#A8ADB3", displayNameColor: "#15171A", fontStyle: "modern", buttonStyle: "square" }, socialIconColor: "#15171A", linkAppearance: wide("filled", "metallic", "silver", "raised") },
] as const;

export const CREATOR_LINK_ONBOARDING_PRESETS: readonly CreatorLinkOnboardingPreset[] = LINK_DESIGN_PRESETS.map((preset) => ({ ...preset, backgroundPresetKey: preset.backgroundId }));
export function getLinkDesignPresets(category?: LinkDesignPresetCategory | null): readonly CreatorLinkOnboardingPreset[] {
  return category ? CREATOR_LINK_ONBOARDING_PRESETS.filter((preset) => preset.category === category) : CREATOR_LINK_ONBOARDING_PRESETS;
}
export function getAvailableLinkDesignPresetCategories(presets: readonly Pick<LinkDesignPreset, "category">[] = CREATOR_LINK_ONBOARDING_PRESETS): readonly LinkDesignPresetCategory[] {
  return LINK_DESIGN_PRESET_CATEGORIES.filter((category) => presets.some((preset) => preset.category === category));
}
export type LinkDesignPage = { themeKey: CreatorLinkTheme; accentColor: string | null; displayNameColor?: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; coverUrl?: string | null };
export type LinkDesignItem = { metadata: CreatorLinkItemAppearance };

export function applyLinkDesignPreset<TPage extends LinkDesignPage, TSocial extends LinkDesignItem, TLink extends LinkDesignItem>(preset: LinkDesignPreset, state: { page: TPage; socials: readonly TSocial[]; links: readonly TLink[] }) {
  return {
    page: { ...state.page, ...preset.page },
    socials: state.socials.map((item) => ({ ...item, metadata: { ...item.metadata, iconColor: preset.socialIconColor } })),
    links: state.links.map((item) => ({ ...item, metadata: { ...preset.linkAppearance } })),
  };
}

function sameAppearance(left: CreatorLinkItemAppearance, right: CreatorLinkItemAppearance) {
  const a = normalizeCreatorLinkItemAppearance(left);
  const b = normalizeCreatorLinkItemAppearance(right);
  return a.layout === b.layout && a.surface === b.surface && a.finish === b.finish && a.color === b.color && a.depth === b.depth && a.iconColor === b.iconColor;
}

export function matchesLinkDesignPreset(preset: LinkDesignPreset, state: { page: LinkDesignPage; socials: readonly LinkDesignItem[]; links: readonly LinkDesignItem[] }) {
  return !state.page.coverUrl && preset.page.themeKey === state.page.themeKey && preset.page.accentColor === state.page.accentColor && preset.page.displayNameColor === state.page.displayNameColor && preset.page.buttonStyle === state.page.buttonStyle && preset.page.fontStyle === state.page.fontStyle
    && state.socials.every((item) => normalizeCreatorLinkItemAppearance(item.metadata).iconColor === preset.socialIconColor)
    && state.links.every((item) => sameAppearance(item.metadata, preset.linkAppearance));
}

export function findMatchingLinkDesignPreset(state: { page: LinkDesignPage; socials?: readonly LinkDesignItem[]; links?: readonly LinkDesignItem[] }) {
  return LINK_DESIGN_PRESETS.find((preset) => matchesLinkDesignPreset(preset, { page: state.page, socials: state.socials ?? [], links: state.links ?? [] })) ?? null;
}

export function findLinkDesignBackgroundPreset(values: { themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle?: CreatorLinkButtonStyle; fontStyle?: CreatorLinkFontStyle }) {
  return findCreatorLinkBackgroundPreset(values);
}

export function findLinkDesignBackgroundById(id: string): CreatorLinkBackgroundPreset | null {
  return CREATOR_LINK_BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? null;
}

export type { CreatorLinkBackgroundPreset };
