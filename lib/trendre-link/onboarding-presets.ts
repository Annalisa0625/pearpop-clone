import type {
  CreatorLinkButtonStyle,
  CreatorLinkFontStyle,
  CreatorLinkTheme,
} from "./constants";
import type { CreatorLinkItemAppearance } from "./item-validation";

export type CreatorLinkPresetCategory = "Clean" | "Soft" | "Cute" | "Beauty" | "Fashion" | "Street" | "Night" | "Music" | "Tech" | "Luxury" | "Natural" | "Pop" | "Botanical" | "Tropical" | "Cosmic";

export type CreatorLinkOnboardingPreset = {
  id: string;
  name: string;
  category: CreatorLinkPresetCategory;
  description: string;
  page: {
    themeKey: CreatorLinkTheme;
    accentColor: string;
    displayNameColor: string;
    fontStyle: CreatorLinkFontStyle;
    buttonStyle: CreatorLinkButtonStyle;
  };
  backgroundPresetKey: string;
  socialIconColor: string | null;
  linkAppearance: CreatorLinkItemAppearance;
};

const wide = (surface: "filled" | "outline", finish: "solid" | "gradient" | "metallic", color: CreatorLinkItemAppearance["color"], depth: "normal" | "soft" | "raised"): CreatorLinkItemAppearance => ({ layout: "wide", surface, finish, color, depth });

export const CREATOR_LINK_ONBOARDING_PRESETS: readonly CreatorLinkOnboardingPreset[] = [
  { id: "studio", name: "Studio", category: "Clean", description: "Crisp editorial white", page: { themeKey: "soft-ivory", accentColor: "#F4F5F7", displayNameColor: "#29272A", fontStyle: "modern", buttonStyle: "rounded" }, backgroundPresetKey: "snow", socialIconColor: "#29272A", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "linen", name: "Linen", category: "Soft", description: "Warm paper and cocoa", page: { themeKey: "natural-beige", accentColor: "#F7EFE1", displayNameColor: "#594A3F", fontStyle: "soft", buttonStyle: "pill" }, backgroundPresetKey: "ivory", socialIconColor: "#806B57", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "bloom", name: "Bloom", category: "Cute", description: "Peach rose daydream", page: { themeKey: "soft-ivory", accentColor: "#E78D91", displayNameColor: "#66283F", fontStyle: "soft", buttonStyle: "rounded" }, backgroundPresetKey: "peach-rose", socialIconColor: "#A52F61", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "aurora", name: "Aurora", category: "Pop", description: "Purple cyan energy", page: { themeKey: "night-purple", accentColor: "#786FD6", displayNameColor: "#FAF9F7", fontStyle: "modern", buttonStyle: "glass" }, backgroundPresetKey: "aurora", socialIconColor: "#FFFFFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "velvet", name: "Velvet", category: "Beauty", description: "Indigo editorial glow", page: { themeKey: "night-purple", accentColor: "#5749B8", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "pill" }, backgroundPresetKey: "indigo-bloom", socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "noir", name: "Noir", category: "Fashion", description: "High contrast runway", page: { themeKey: "minimal-black", accentColor: "#18171B", displayNameColor: "#FAF9F7", fontStyle: "bold", buttonStyle: "square" }, backgroundPresetKey: "midnight", socialIconColor: "#FAF9F7", linkAppearance: wide("filled", "solid", "white", "raised") },
  { id: "skyline", name: "Skyline", category: "Clean", description: "Layered blue current", page: { themeKey: "minimal-black", accentColor: "#3B9BDE", displayNameColor: "#F4FDFF", fontStyle: "modern", buttonStyle: "glass" }, backgroundPresetKey: "blue-current", socialIconColor: "#F4FDFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "flare", name: "Flare", category: "Street", description: "Hot ember gradient", page: { themeKey: "night-purple", accentColor: "#E84B32", displayNameColor: "#FFF4E8", fontStyle: "bold", buttonStyle: "rounded" }, backgroundPresetKey: "ember", socialIconColor: "#FFF4E8", linkAppearance: wide("filled", "solid", "charcoal", "raised") },
  { id: "wildcat", name: "Wildcat", category: "Fashion", description: "Electric blue leopard", page: { themeKey: "natural-beige", accentColor: "#B98552", displayNameColor: "#071B2C", fontStyle: "serif", buttonStyle: "pill" }, backgroundPresetKey: "leopard", socialIconColor: "#071B2C", linkAppearance: wide("filled", "solid", "white", "raised") },
  { id: "oak", name: "Oak", category: "Natural", description: "Warm walnut grain", page: { themeKey: "natural-beige", accentColor: "#76513B", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "rounded" }, backgroundPresetKey: "walnut", socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "matrix", name: "Matrix", category: "Tech", description: "Fine grid precision", page: { themeKey: "minimal-black", accentColor: "#26313B", displayNameColor: "#DDFBFF", fontStyle: "modern", buttonStyle: "square" }, backgroundPresetKey: "fine-grid", socialIconColor: "#75D7E5", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "confetti", name: "Confetti", category: "Pop", description: "Editorial micro dot rhythm", page: { themeKey: "natural-beige", accentColor: "#D5C9A8", displayNameColor: "#40372F", fontStyle: "bold", buttonStyle: "pill" }, backgroundPresetKey: "micro-dots", socialIconColor: "#51463B", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "chrome", name: "Chrome", category: "Luxury", description: "Polished future metal", page: { themeKey: "minimal-black", accentColor: "#A8ADB3", displayNameColor: "#15171A", fontStyle: "modern", buttonStyle: "square" }, backgroundPresetKey: "brushed-silver", socialIconColor: "#15171A", linkAppearance: wide("filled", "metallic", "silver", "raised") },
  { id: "tidal", name: "Tidal", category: "Music", description: "Mint aqua motion", page: { themeKey: "natural-beige", accentColor: "#51BFAE", displayNameColor: "#153E43", fontStyle: "soft", buttonStyle: "glass" }, backgroundPresetKey: "aqua-mint", socialIconColor: "#164C51", linkAppearance: wide("outline", "solid", "charcoal", "soft") },
  { id: "candy", name: "Candy", category: "Cute", description: "Pink purple prism", page: { themeKey: "night-purple", accentColor: "#C754B7", displayNameColor: "#FFF5FB", fontStyle: "soft", buttonStyle: "pill" }, backgroundPresetKey: "pink-prism", socialIconColor: "#FFF5FB", linkAppearance: wide("filled", "solid", "pink", "raised") },
  { id: "afterglow", name: "Afterglow", category: "Night", description: "Midnight violet haze", page: { themeKey: "night-purple", accentColor: "#292052", displayNameColor: "#F4ECFF", fontStyle: "serif", buttonStyle: "glass" }, backgroundPresetKey: "afterglow", socialIconColor: "#D6BDFF", linkAppearance: wide("outline", "gradient", "aurora", "soft") },
  { id: "moss", name: "Moss", category: "Natural", description: "Forest and mineral", page: { themeKey: "minimal-black", accentColor: "#2B7868", displayNameColor: "#EFFFEF", fontStyle: "modern", buttonStyle: "rounded" }, backgroundPresetKey: "emerald-night", socialIconColor: "#D9FFD8", linkAppearance: wide("filled", "gradient", "emerald", "soft") },
  { id: "edition", name: "Edition", category: "Luxury", description: "Cream ink editorial", page: { themeKey: "natural-beige", accentColor: "#E8D3AA", displayNameColor: "#29272A", fontStyle: "serif", buttonStyle: "square" }, backgroundPresetKey: "editorial-paper", socialIconColor: "#29272A", linkAppearance: wide("outline", "solid", "charcoal", "normal") },
  { id: "botanica", name: "Botanica", category: "Botanical", description: "Ivory leaf atelier", page: { themeKey: "natural-beige", accentColor: "#EEE5D2", displayNameColor: "#394238", fontStyle: "serif", buttonStyle: "rounded" }, backgroundPresetKey: "botanical-ivory", socialIconColor: "#52624F", linkAppearance: wide("filled", "solid", "sand", "soft") },
  { id: "canopy", name: "Canopy", category: "Tropical", description: "Deep premium foliage", page: { themeKey: "minimal-black", accentColor: "#135A45", displayNameColor: "#F4F1DC", fontStyle: "bold", buttonStyle: "pill" }, backgroundPresetKey: "tropical-leaf", socialIconColor: "#E7E9C5", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "sage", name: "Sage", category: "Botanical", description: "Quiet garden texture", page: { themeKey: "natural-beige", accentColor: "#BFCDB4", displayNameColor: "#364136", fontStyle: "soft", buttonStyle: "rounded" }, backgroundPresetKey: "sage-garden", socialIconColor: "#52604D", linkAppearance: wide("filled", "solid", "green", "soft") },
  { id: "celestia", name: "Celestia", category: "Cosmic", description: "Layered midnight stars", page: { themeKey: "minimal-black", accentColor: "#101A3C", displayNameColor: "#F1F5FF", fontStyle: "modern", buttonStyle: "glass" }, backgroundPresetKey: "deep-starfield", socialIconColor: "#DCE8FF", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "nebula", name: "Nebula", category: "Cosmic", description: "Magenta blue galaxy", page: { themeKey: "night-purple", accentColor: "#5A3A91", displayNameColor: "#FFF2FC", fontStyle: "bold", buttonStyle: "glass" }, backgroundPresetKey: "purple-galaxy", socialIconColor: "#FCE8FF", linkAppearance: wide("filled", "gradient", "aurora", "raised") },
  { id: "moonlit", name: "Moonlit", category: "Cosmic", description: "Quiet lunar luxury", page: { themeKey: "minimal-black", accentColor: "#18243F", displayNameColor: "#F6EFD0", fontStyle: "serif", buttonStyle: "pill" }, backgroundPresetKey: "moonlight", socialIconColor: "#F6EFD0", linkAppearance: wide("outline", "solid", "white", "soft") },
] as const;

export function findMatchingOnboardingPreset(values: {
  themeKey: CreatorLinkTheme;
  accentColor: string | null;
  displayNameColor?: string | null;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
}): CreatorLinkOnboardingPreset | null {
  return CREATOR_LINK_ONBOARDING_PRESETS.find((preset) =>
    preset.page.themeKey === values.themeKey
    && preset.page.accentColor === values.accentColor
    && preset.page.displayNameColor === values.displayNameColor
    && preset.page.buttonStyle === values.buttonStyle
    && preset.page.fontStyle === values.fontStyle
  ) ?? null;
}
