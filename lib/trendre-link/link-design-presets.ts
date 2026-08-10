import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";
import { CREATOR_LINK_BACKGROUND_PRESETS, findCreatorLinkBackgroundPreset, type CreatorLinkBackgroundPreset } from "./background-presets";
import { normalizeCreatorLinkItemAppearance, type CreatorLinkItemAppearance } from "./item-validation";

export type CreatorLinkPresetCategory = "Clean" | "Soft" | "Cute" | "Beauty" | "Fashion" | "Street" | "Night" | "Music" | "Tech" | "Luxury" | "Natural" | "Pop" | "Botanical" | "Tropical" | "Cosmic";
export type LinkDesignPreset = { id: string; name: string; category: CreatorLinkPresetCategory; description: string; backgroundId: string; page: { themeKey: CreatorLinkTheme; accentColor: string; displayNameColor: string; fontStyle: CreatorLinkFontStyle; buttonStyle: CreatorLinkButtonStyle }; socialIconColor: string | null; linkAppearance: CreatorLinkItemAppearance };
/** @deprecated Compatibility shape for existing onboarding imports. Use LinkDesignPreset. */
export type CreatorLinkOnboardingPreset = LinkDesignPreset & { backgroundPresetKey: string };

const wide = (surface: "filled" | "outline", finish: "solid" | "gradient" | "metallic", color: CreatorLinkItemAppearance["color"], depth: "normal" | "soft" | "raised"): CreatorLinkItemAppearance => ({ layout: "wide", surface, finish, color, depth });

export const LINK_DESIGN_PRESETS: readonly LinkDesignPreset[] = [
  { id: "studio", name: "Studio", category: "Clean", description: "Crisp editorial white", backgroundId: "snow", page: { themeKey: "soft-ivory", accentColor: "#F4F5F7", displayNameColor: "#29272A", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#29272A", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "linen", name: "Linen", category: "Soft", description: "Warm paper and cocoa", backgroundId: "ivory", page: { themeKey: "natural-beige", accentColor: "#F7EFE1", displayNameColor: "#594A3F", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#806B57", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "bloom", name: "Bloom", category: "Cute", description: "Peach rose daydream", backgroundId: "peach-rose", page: { themeKey: "soft-ivory", accentColor: "#E78D91", displayNameColor: "#66283F", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#A52F61", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "aurora", name: "Aurora", category: "Pop", description: "Purple cyan energy", backgroundId: "aurora", page: { themeKey: "night-purple", accentColor: "#786FD6", displayNameColor: "#FAF9F7", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#FFFFFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "velvet", name: "Velvet", category: "Beauty", description: "Indigo editorial glow", backgroundId: "indigo-bloom", page: { themeKey: "night-purple", accentColor: "#5749B8", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "noir", name: "Noir", category: "Fashion", description: "High contrast runway", backgroundId: "midnight", page: { themeKey: "minimal-black", accentColor: "#18171B", displayNameColor: "#FAF9F7", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#FAF9F7", linkAppearance: wide("filled", "solid", "white", "raised") },
  { id: "skyline", name: "Skyline", category: "Clean", description: "Layered blue current", backgroundId: "blue-current", page: { themeKey: "minimal-black", accentColor: "#3B9BDE", displayNameColor: "#F4FDFF", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#F4FDFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "flare", name: "Flare", category: "Street", description: "Hot ember gradient", backgroundId: "ember", page: { themeKey: "night-purple", accentColor: "#E84B32", displayNameColor: "#FFF4E8", fontStyle: "bold", buttonStyle: "rounded" }, socialIconColor: "#FFF4E8", linkAppearance: wide("filled", "solid", "charcoal", "raised") },
  { id: "wildcat", name: "Wildcat", category: "Fashion", description: "Electric blue leopard", backgroundId: "leopard", page: { themeKey: "natural-beige", accentColor: "#B98552", displayNameColor: "#071B2C", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#071B2C", linkAppearance: wide("filled", "solid", "white", "raised") },
  { id: "oak", name: "Oak", category: "Natural", description: "Warm walnut grain", backgroundId: "walnut", page: { themeKey: "natural-beige", accentColor: "#76513B", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "matrix", name: "Matrix", category: "Tech", description: "Fine grid precision", backgroundId: "fine-grid", page: { themeKey: "minimal-black", accentColor: "#26313B", displayNameColor: "#DDFBFF", fontStyle: "modern", buttonStyle: "square" }, socialIconColor: "#75D7E5", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "confetti", name: "Confetti", category: "Pop", description: "Editorial micro dot rhythm", backgroundId: "micro-dots", page: { themeKey: "natural-beige", accentColor: "#D5C9A8", displayNameColor: "#40372F", fontStyle: "bold", buttonStyle: "pill" }, socialIconColor: "#51463B", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "chrome", name: "Chrome", category: "Luxury", description: "Polished future metal", backgroundId: "brushed-silver", page: { themeKey: "minimal-black", accentColor: "#A8ADB3", displayNameColor: "#15171A", fontStyle: "modern", buttonStyle: "square" }, socialIconColor: "#15171A", linkAppearance: wide("filled", "metallic", "silver", "raised") },
  { id: "tidal", name: "Tidal", category: "Music", description: "Mint aqua motion", backgroundId: "aqua-mint", page: { themeKey: "natural-beige", accentColor: "#51BFAE", displayNameColor: "#153E43", fontStyle: "soft", buttonStyle: "glass" }, socialIconColor: "#164C51", linkAppearance: wide("outline", "solid", "charcoal", "soft") },
  { id: "candy", name: "Candy", category: "Cute", description: "Pink purple prism", backgroundId: "pink-prism", page: { themeKey: "night-purple", accentColor: "#C754B7", displayNameColor: "#FFF5FB", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#FFF5FB", linkAppearance: wide("filled", "solid", "pink", "raised") },
  { id: "afterglow", name: "Afterglow", category: "Night", description: "Midnight violet haze", backgroundId: "afterglow", page: { themeKey: "night-purple", accentColor: "#292052", displayNameColor: "#F4ECFF", fontStyle: "serif", buttonStyle: "glass" }, socialIconColor: "#D6BDFF", linkAppearance: wide("outline", "gradient", "aurora", "soft") },
  { id: "moss", name: "Moss", category: "Natural", description: "Forest and mineral", backgroundId: "emerald-night", page: { themeKey: "minimal-black", accentColor: "#2B7868", displayNameColor: "#EFFFEF", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#D9FFD8", linkAppearance: wide("filled", "gradient", "emerald", "soft") },
  { id: "edition", name: "Edition", category: "Luxury", description: "Cream ink editorial", backgroundId: "editorial-paper", page: { themeKey: "natural-beige", accentColor: "#E8D3AA", displayNameColor: "#29272A", fontStyle: "serif", buttonStyle: "square" }, socialIconColor: "#29272A", linkAppearance: wide("outline", "solid", "charcoal", "normal") },
  { id: "botanica", name: "Botanica", category: "Botanical", description: "Ivory leaf atelier", backgroundId: "botanical-ivory", page: { themeKey: "natural-beige", accentColor: "#EEE5D2", displayNameColor: "#394238", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#52624F", linkAppearance: wide("filled", "solid", "sand", "soft") },
  { id: "canopy", name: "Canopy", category: "Tropical", description: "Deep premium foliage", backgroundId: "tropical-leaf", page: { themeKey: "minimal-black", accentColor: "#135A45", displayNameColor: "#F4F1DC", fontStyle: "bold", buttonStyle: "pill" }, socialIconColor: "#E7E9C5", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "sage", name: "Sage", category: "Botanical", description: "Quiet garden texture", backgroundId: "sage-garden", page: { themeKey: "natural-beige", accentColor: "#BFCDB4", displayNameColor: "#364136", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#52604D", linkAppearance: wide("filled", "solid", "green", "soft") },
  { id: "celestia", name: "Celestia", category: "Cosmic", description: "Layered midnight stars", backgroundId: "deep-starfield", page: { themeKey: "minimal-black", accentColor: "#101A3C", displayNameColor: "#F1F5FF", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#DCE8FF", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "nebula", name: "Nebula", category: "Cosmic", description: "Magenta blue galaxy", backgroundId: "purple-galaxy", page: { themeKey: "night-purple", accentColor: "#5A3A91", displayNameColor: "#FFF2FC", fontStyle: "bold", buttonStyle: "glass" }, socialIconColor: "#FCE8FF", linkAppearance: wide("filled", "gradient", "aurora", "raised") },
  { id: "moonlit", name: "Moonlit", category: "Cosmic", description: "Quiet lunar luxury", backgroundId: "moonlight", page: { themeKey: "minimal-black", accentColor: "#18243F", displayNameColor: "#F6EFD0", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#F6EFD0", linkAppearance: wide("outline", "solid", "white", "soft") },
] as const;

export const CREATOR_LINK_ONBOARDING_PRESETS: readonly CreatorLinkOnboardingPreset[] = LINK_DESIGN_PRESETS.map((preset) => ({ ...preset, backgroundPresetKey: preset.backgroundId }));
export type LinkDesignPage = { themeKey: CreatorLinkTheme; accentColor: string | null; displayNameColor?: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle };
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
  return preset.page.themeKey === state.page.themeKey && preset.page.accentColor === state.page.accentColor && preset.page.displayNameColor === state.page.displayNameColor && preset.page.buttonStyle === state.page.buttonStyle && preset.page.fontStyle === state.page.fontStyle
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
