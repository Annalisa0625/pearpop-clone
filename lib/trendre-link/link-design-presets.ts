import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";
import { CREATOR_LINK_BACKGROUND_PRESETS, findCreatorLinkBackgroundPreset, type CreatorLinkBackgroundPreset } from "./background-presets";
import { applyCreatorLinkItemStyle, normalizeCreatorLinkItemAppearance, type CreatorLinkItemAppearance, type CreatorLinkItemShape, type CreatorLinkItemStyle, type CreatorLinkSocialShape, type CreatorLinkSocialStyle } from "./item-validation";

export const LINK_DESIGN_PRESET_CATEGORIES = ["normal", "gradient", "metal", "animal", "pattern", "emotion", "pretty", "nature", "city"] as const;
export type LinkDesignPresetCategory = (typeof LINK_DESIGN_PRESET_CATEGORIES)[number];
export type CreatorLinkPresetCategory = LinkDesignPresetCategory;
export type LinkDesignPreset = { id: string; name: string; category: LinkDesignPresetCategory; tags?: readonly string[]; description: string; backgroundId: string; page: { themeKey: CreatorLinkTheme; accentColor: string; displayNameColor: string; fontStyle: CreatorLinkFontStyle; buttonStyle: CreatorLinkButtonStyle }; socialIconColor: string | null; socialStyle: CreatorLinkSocialStyle; socialShape: CreatorLinkSocialShape; socialSurfaceColor: string | null; socialBorderColor: string | null; linkAppearance: CreatorLinkItemAppearance };
/** @deprecated Compatibility shape for existing onboarding imports. Use LinkDesignPreset. */
export type CreatorLinkOnboardingPreset = LinkDesignPreset & { backgroundPresetKey: string };

const wide = (surface: "filled" | "outline", finish: "solid" | "gradient" | "metallic", color: CreatorLinkItemAppearance["color"], depth: "normal" | "soft" | "raised"): CreatorLinkItemAppearance => ({ layout: "wide", surface, finish, color, depth });

const BASE_LINK_DESIGN_PRESETS = [
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
  { id: "python-noir", name: "Python Noir", category: "animal", tags: ["snake", "python", "black", "luxury", "dark"], description: "Black python luxury", backgroundId: "animal-python-noir", page: { themeKey: "minimal-black", accentColor: "#17151A", displayNameColor: "#FAF7F2", fontStyle: "serif", buttonStyle: "glass" }, socialIconColor: "#FAF7F2", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "zebra-mono", name: "Zebra Mono", category: "animal", tags: ["zebra", "mono", "black", "white", "bold"], description: "Bold monochrome zebra", backgroundId: "animal-zebra-mono", page: { themeKey: "soft-ivory", accentColor: "#D7D7D5", displayNameColor: "#171719", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#171719", linkAppearance: wide("filled", "solid", "charcoal", "raised") },
  { id: "zebra-midnight", name: "Zebra Midnight", category: "animal", tags: ["zebra", "navy", "glitter", "night"], description: "Midnight zebra shimmer", backgroundId: "animal-zebra-midnight", page: { themeKey: "minimal-black", accentColor: "#17223F", displayNameColor: "#F3F6FF", fontStyle: "bold", buttonStyle: "glass" }, socialIconColor: "#F3F6FF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "zebra-pink", name: "Zebra Pink", category: "animal", tags: ["zebra", "pink", "glitter", "girly"], description: "Pink glitter zebra", backgroundId: "animal-zebra-pink", page: { themeKey: "soft-ivory", accentColor: "#E7A8C0", displayNameColor: "#55283A", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#71344C", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "leopard-classic", name: "Leopard Classic", category: "animal", tags: ["leopard", "beige", "brown", "classic"], description: "Classic warm leopard", backgroundId: "animal-leopard-classic", page: { themeKey: "natural-beige", accentColor: "#B88B5A", displayNameColor: "#35251B", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#493224", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "leopard-mono", name: "Leopard Mono", category: "animal", tags: ["leopard", "mono", "gray", "black"], description: "Monochrome leopard", backgroundId: "animal-leopard-mono", page: { themeKey: "minimal-black", accentColor: "#77797D", displayNameColor: "#FAFAF8", fontStyle: "modern", buttonStyle: "square" }, socialIconColor: "#FAFAF8", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "leopard-pink", name: "Leopard Pink", category: "animal", tags: ["leopard", "pink", "cute", "girly"], description: "Playful pink leopard", backgroundId: "animal-leopard-pink", page: { themeKey: "soft-ivory", accentColor: "#D987A4", displayNameColor: "#512437", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#6C3049", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "leopard-ice", name: "Leopard Ice", category: "animal", tags: ["leopard", "blue", "ice", "soft"], description: "Soft icy leopard", backgroundId: "animal-leopard-ice", page: { themeKey: "soft-ivory", accentColor: "#9DC9DD", displayNameColor: "#203D4D", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#2C5265", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "midnight-ornament", name: "Midnight Ornament", category: "pattern", tags: ["black", "ornament", "luxury", "dark"], description: "Dark ornamental luxury", backgroundId: "pattern-midnight-ornament", page: { themeKey: "minimal-black", accentColor: "#201B27", displayNameColor: "#F7F0E5", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#F7F0E5", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "brick", name: "Brick", category: "pattern", tags: ["brick", "red", "urban", "texture"], description: "Warm urban brick", backgroundId: "pattern-brick", page: { themeKey: "natural-beige", accentColor: "#9B5145", displayNameColor: "#FFF5ED", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#FFF5ED", linkAppearance: wide("filled", "solid", "charcoal", "raised") },
  { id: "vintage-wood", name: "Vintage Wood", category: "pattern", tags: ["wood", "brown", "vintage", "warm"], description: "Warm vintage timber", backgroundId: "pattern-vintage-wood", page: { themeKey: "natural-beige", accentColor: "#76523D", displayNameColor: "#FFF5E7", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#FFF5E7", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "navy-plaid", name: "Navy Plaid", category: "pattern", tags: ["plaid", "navy", "pink", "classic"], description: "Classic navy plaid", backgroundId: "pattern-navy-plaid", page: { themeKey: "minimal-black", accentColor: "#263556", displayNameColor: "#FFF1F6", fontStyle: "serif", buttonStyle: "square" }, socialIconColor: "#FFF1F6", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "white-marble", name: "White Marble", category: "pattern", tags: ["marble", "white", "clean", "luxury"], description: "Clean white marble", backgroundId: "pattern-white-marble", page: { themeKey: "soft-ivory", accentColor: "#E5E2DE", displayNameColor: "#29272A", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#3E3B3D", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "liquid-gold", name: "Liquid Gold", category: "pattern", tags: ["gold", "black", "marble", "luxury"], description: "Black and liquid gold", backgroundId: "pattern-liquid-gold", page: { themeKey: "minimal-black", accentColor: "#AD8A48", displayNameColor: "#FFF3D0", fontStyle: "serif", buttonStyle: "glass" }, socialIconColor: "#FFF3D0", linkAppearance: wide("filled", "metallic", "champagne-gold", "raised") },
  { id: "paisley-noir", name: "Paisley Noir", category: "pattern", tags: ["paisley", "mono", "black", "white"], description: "Monochrome paisley", backgroundId: "pattern-paisley-noir", page: { themeKey: "minimal-black", accentColor: "#2A292D", displayNameColor: "#FAF9F7", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#FAF9F7", linkAppearance: wide("outline", "solid", "white", "normal") },
  { id: "paisley-blue", name: "Paisley Blue", category: "pattern", tags: ["paisley", "blue", "ivory"], description: "Blue ivory paisley", backgroundId: "pattern-paisley-blue", page: { themeKey: "natural-beige", accentColor: "#587799", displayNameColor: "#172C42", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#213D59", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "aqua-silk", name: "Aqua Silk", category: "pattern", tags: ["aqua", "wave", "soft", "abstract"], description: "Soft flowing aqua", backgroundId: "pattern-aqua-silk", page: { themeKey: "soft-ivory", accentColor: "#75BFC0", displayNameColor: "#173F42", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#235B5E", linkAppearance: wide("filled", "solid", "charcoal", "soft") },
  { id: "silver-marble", name: "Silver Marble", category: "pattern", tags: ["silver", "marble", "gray", "clean"], description: "Clean silver marble", backgroundId: "pattern-silver-marble", page: { themeKey: "soft-ivory", accentColor: "#A7ACB2", displayNameColor: "#25282B", fontStyle: "modern", buttonStyle: "square" }, socialIconColor: "#363A3E", linkAppearance: wide("filled", "metallic", "silver", "soft") },
  { id: "retro-daisy", name: "Retro Daisy", category: "pattern", tags: ["flower", "brown", "retro", "cream"], description: "Cream retro florals", backgroundId: "pattern-retro-daisy", page: { themeKey: "natural-beige", accentColor: "#A37B58", displayNameColor: "#39291D", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#503925", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "bandana-black", name: "Bandana Black", category: "pattern", tags: ["bandana", "paisley", "black", "bold"], description: "Bold black bandana", backgroundId: "pattern-bandana-black", page: { themeKey: "minimal-black", accentColor: "#19191C", displayNameColor: "#FAF9F7", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#FAF9F7", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "blue-hour", name: "Blue Hour", category: "emotion", tags: ["twilight", "blue", "pink", "dreamy"], description: "Dreamy blue twilight", backgroundId: "emotion-blue-hour", page: { themeKey: "night-purple", accentColor: "#556B99", displayNameColor: "#FFF2F8", fontStyle: "soft", buttonStyle: "glass" }, socialIconColor: "#FFF2F8", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "dreamy-coast", name: "Dreamy Coast", category: "emotion", tags: ["pastel", "ocean", "pink", "dreamy", "soft"], description: "Pastel ocean daydream", backgroundId: "emotion-dreamy-coast", page: { themeKey: "soft-ivory", accentColor: "#D7A8B8", displayNameColor: "#50303F", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#6B4053", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "burning-sunset", name: "Burning Sunset", category: "emotion", tags: ["sunset", "orange", "purple", "dramatic", "ocean"], description: "Dramatic burning coast", backgroundId: "emotion-burning-sunset", page: { themeKey: "night-purple", accentColor: "#B95D45", displayNameColor: "#FFF5EC", fontStyle: "bold", buttonStyle: "glass" }, socialIconColor: "#FFF5EC", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "tiny-hearts", name: "Tiny Hearts", category: "pretty", tags: ["heart", "mono", "minimal", "cute"], description: "Minimal tiny hearts", backgroundId: "pretty-tiny-hearts", page: { themeKey: "soft-ivory", accentColor: "#F5F4F0", displayNameColor: "#3D393B", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#504B4D", linkAppearance: wide("filled", "solid", "charcoal", "normal") },
  { id: "baby-argyle", name: "Baby Argyle", category: "pretty", tags: ["blue", "argyle", "heart", "cute"], description: "Baby blue heart argyle", backgroundId: "pretty-baby-argyle", page: { themeKey: "soft-ivory", accentColor: "#AFC8E8", displayNameColor: "#29425E", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#365879", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "mint-gingham", name: "Mint Gingham", category: "pretty", tags: ["mint", "gingham", "soft", "cute"], description: "Soft mint gingham", backgroundId: "pretty-mint-gingham", page: { themeKey: "natural-beige", accentColor: "#B8DBCD", displayNameColor: "#315044", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#426B5B", linkAppearance: wide("filled", "solid", "green", "soft") },
  { id: "cloudy-wish", name: "Cloudy Wish", category: "pretty", tags: ["cloud", "star", "white", "dreamy"], description: "Clouds and quiet wishes", backgroundId: "pretty-cloudy-wish", page: { themeKey: "soft-ivory", accentColor: "#DDE4ED", displayNameColor: "#354253", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#46576C", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "blush-hearts", name: "Blush Hearts", category: "pretty", tags: ["pink", "heart", "cute", "minimal"], description: "Blush repeating hearts", backgroundId: "pretty-blush-hearts", page: { themeKey: "soft-ivory", accentColor: "#E9B4C2", displayNameColor: "#5A3040", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#744055", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "bubble-love", name: "Bubble Love", category: "pretty", tags: ["blue", "heart", "bubble", "glossy"], description: "Glossy bubble hearts", backgroundId: "pretty-bubble-love", page: { themeKey: "soft-ivory", accentColor: "#8DBACF", displayNameColor: "#173D50", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#24566D", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "pastel-shore", name: "Pastel Shore", category: "nature", tags: ["ocean", "beach", "pastel", "aqua"], description: "Pastel aqua shoreline", backgroundId: "nature-pastel-shore", page: { themeKey: "soft-ivory", accentColor: "#A3D4D1", displayNameColor: "#234B4A", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#326564", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "deep-blue-wave", name: "Deep Blue Wave", category: "nature", tags: ["wave", "ocean", "blue", "bold"], description: "Bold deep blue wave", backgroundId: "nature-deep-blue-wave", page: { themeKey: "minimal-black", accentColor: "#145C8D", displayNameColor: "#F1FAFF", fontStyle: "bold", buttonStyle: "glass" }, socialIconColor: "#F1FAFF", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "aqua-water", name: "Aqua Water", category: "nature", tags: ["water", "aqua", "summer", "clean"], description: "Clear aqua water", backgroundId: "nature-aqua-water", page: { themeKey: "soft-ivory", accentColor: "#63C8CF", displayNameColor: "#17464A", fontStyle: "modern", buttonStyle: "rounded" }, socialIconColor: "#205F64", linkAppearance: wide("filled", "solid", "blue", "soft") },
  { id: "forest-light", name: "Forest Light", category: "nature", tags: ["forest", "green", "sunlight", "deep"], description: "Sunlight through forest", backgroundId: "nature-forest-light", page: { themeKey: "minimal-black", accentColor: "#315D42", displayNameColor: "#F1FFF1", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#F1FFF1", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "bamboo-breeze", name: "Bamboo Breeze", category: "nature", tags: ["bamboo", "green", "fresh", "japanese"], description: "Fresh bamboo breeze", backgroundId: "nature-bamboo-breeze", page: { themeKey: "natural-beige", accentColor: "#7FA06A", displayNameColor: "#293D24", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#3D5934", linkAppearance: wide("filled", "solid", "green", "soft") },
  { id: "snow-glow", name: "Snow Glow", category: "nature", tags: ["snow", "winter", "ice", "blue", "soft"], description: "Soft blue snow glow", backgroundId: "nature-snow-glow", page: { themeKey: "soft-ivory", accentColor: "#C7DCE9", displayNameColor: "#2D4656", fontStyle: "soft", buttonStyle: "rounded" }, socialIconColor: "#3E6074", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "sunset-shore", name: "Sunset Shore", category: "nature", tags: ["ocean", "sunset", "pink", "purple", "dreamy"], description: "Dreamy sunset shoreline", backgroundId: "nature-sunset-shore", page: { themeKey: "night-purple", accentColor: "#D88A91", displayNameColor: "#FFF6F1", fontStyle: "soft", buttonStyle: "glass" }, socialIconColor: "#FFF6F1", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "neon-palms", name: "Neon Palms", category: "city", tags: ["neon", "pink", "night", "palms", "retro"], description: "Retro neon palms", backgroundId: "city-neon-palms", page: { themeKey: "night-purple", accentColor: "#A93B84", displayNameColor: "#FFF0FA", fontStyle: "bold", buttonStyle: "glass" }, socialIconColor: "#FFF0FA", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "sunset-downtown", name: "Sunset Downtown", category: "city", tags: ["sunset", "city", "orange", "illustration", "retro"], description: "Illustrated sunset downtown", backgroundId: "city-sunset-downtown", page: { themeKey: "natural-beige", accentColor: "#C96B44", displayNameColor: "#3E241B", fontStyle: "bold", buttonStyle: "rounded" }, socialIconColor: "#563126", linkAppearance: wide("filled", "solid", "charcoal", "raised") },
  { id: "neon-crossing", name: "Neon Crossing", category: "city", tags: ["neon", "night", "purple", "cyber", "urban"], description: "Cyber neon crossing", backgroundId: "city-neon-crossing", page: { themeKey: "night-purple", accentColor: "#5C3E8E", displayNameColor: "#F9EDFF", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#F9EDFF", linkAppearance: wide("outline", "solid", "white", "soft") },
  { id: "autumn-avenue", name: "Autumn Avenue", category: "city", tags: ["autumn", "street", "warm", "classic", "europe"], description: "Classic autumn avenue", backgroundId: "city-autumn-avenue", page: { themeKey: "natural-beige", accentColor: "#9A6A44", displayNameColor: "#342319", fontStyle: "serif", buttonStyle: "pill" }, socialIconColor: "#493024", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "sunset-boulevard", name: "Sunset Boulevard", category: "city", tags: ["80s", "comic", "retro", "sunset", "palms"], description: "Eighties sunset boulevard", backgroundId: "city-sunset-boulevard", page: { themeKey: "night-purple", accentColor: "#E17755", displayNameColor: "#FFF4EC", fontStyle: "bold", buttonStyle: "rounded" }, socialIconColor: "#FFF4EC", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "retro-block", name: "Retro Block", category: "city", tags: ["retro", "blue", "red", "illustration", "street"], description: "Graphic retro block", backgroundId: "city-retro-block", page: { themeKey: "soft-ivory", accentColor: "#4D7190", displayNameColor: "#F8FAFC", fontStyle: "bold", buttonStyle: "square" }, socialIconColor: "#F8FAFC", linkAppearance: wide("outline", "solid", "white", "raised") },
  { id: "coastal-town", name: "Coastal Town", category: "city", tags: ["coast", "mediterranean", "colorful", "summer", "town"], description: "Colorful coastal town", backgroundId: "city-coastal-town", page: { themeKey: "soft-ivory", accentColor: "#4E9EA0", displayNameColor: "#173F41", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#215B5D", linkAppearance: wide("filled", "solid", "white", "soft") },
  { id: "cafe-lane", name: "Café Lane", category: "city", tags: ["cafe", "flowers", "street", "europe", "cozy"], description: "Cozy flower café lane", backgroundId: "city-cafe-lane", page: { themeKey: "natural-beige", accentColor: "#9B725A", displayNameColor: "#33251D", fontStyle: "serif", buttonStyle: "rounded" }, socialIconColor: "#493529", linkAppearance: wide("filled", "solid", "brown", "soft") },
  { id: "tokyo-sakura", name: "Tokyo Sakura", category: "city", tags: ["tokyo", "sakura", "japan", "sunset"], description: "Tokyo sakura sunset", backgroundId: "city-tokyo-sakura", page: { themeKey: "soft-ivory", accentColor: "#D97E9D", displayNameColor: "#4D2334", fontStyle: "soft", buttonStyle: "pill" }, socialIconColor: "#682F47", linkAppearance: wide("filled", "solid", "pink", "soft") },
  { id: "tokyo-neon", name: "Tokyo Neon", category: "city", tags: ["tokyo", "japan", "neon", "urban", "night"], description: "Tokyo neon night", backgroundId: "city-tokyo-neon", page: { themeKey: "night-purple", accentColor: "#3E2D75", displayNameColor: "#F8EFFF", fontStyle: "modern", buttonStyle: "glass" }, socialIconColor: "#F8EFFF", linkAppearance: wide("outline", "solid", "white", "soft") },
] as const;

function coordinatedLinkShape(category: LinkDesignPresetCategory, buttonStyle: CreatorLinkButtonStyle): CreatorLinkItemShape {
  if (category === "metal" || category === "pattern") return buttonStyle === "pill" ? "pill" : "soft-square";
  if (category === "pretty" || category === "emotion") return "pill";
  if (buttonStyle === "pill") return "pill";
  if (buttonStyle === "square") return category === "animal" ? "square" : "soft-square";
  return "rounded";
}

function coordinatedLinkStyle(category: LinkDesignPresetCategory, buttonStyle: CreatorLinkButtonStyle, depth: CreatorLinkItemAppearance["depth"]): CreatorLinkItemStyle {
  if (buttonStyle === "glass" || category === "emotion") return "glass";
  if (category === "metal" || depth === "raised") return "shadow";
  if (category === "pattern") return buttonStyle === "square" ? "outline" : "soft";
  if (category === "pretty" || category === "nature") return "soft";
  return "solid";
}

function coordinatedSocialStyle(id: string, category: LinkDesignPresetCategory): CreatorLinkSocialStyle {
  if (["aurora", "tidal", "python-noir", "zebra-midnight", "liquid-gold", "blue-hour", "burning-sunset", "deep-blue-wave", "sunset-shore", "neon-palms", "neon-crossing", "tokyo-neon"].includes(id)) return "glass";
  if (["linen", "lavender", "terracotta", "dreamy-coast", "baby-argyle", "cloudy-wish", "pastel-shore", "bamboo-breeze", "coastal-town", "tokyo-sakura"].includes(id)) return "pill";
  if (category === "animal" || category === "metal" || category === "pretty" || category === "nature") return "circle";
  return "icons";
}

function coordinatedSocialShape(category: LinkDesignPresetCategory, socialStyle: CreatorLinkSocialStyle): CreatorLinkSocialShape {
  if (category === "normal") return socialStyle === "pill" ? "pill" : "icons";
  if (socialStyle === "pill" || category === "pretty") return "pill";
  return "circle";
}

function isLightHex(value: string | null): boolean {
  if (!value) return false;
  const parsed = Number.parseInt(value.slice(1), 16);
  const luminance = (((parsed >> 16) & 255) * 299 + ((parsed >> 8) & 255) * 587 + (parsed & 255) * 114) / 1000;
  return luminance > 155;
}

function coordinatedSocialSurfaceColor(shape: CreatorLinkSocialShape, iconColor: string | null): string | null {
  if (shape === "icons") return null;
  if (!iconColor) return "#FAF9F7";
  return isLightHex(iconColor) ? "#29272A" : "#FAF9F7";
}

export const LINK_DESIGN_PRESETS: readonly LinkDesignPreset[] = BASE_LINK_DESIGN_PRESETS.map((preset) => {
  const shape = coordinatedLinkShape(preset.category, preset.page.buttonStyle);
  const style = coordinatedLinkStyle(preset.category, preset.page.buttonStyle, preset.linkAppearance.depth);
  const socialStyle = coordinatedSocialStyle(preset.id, preset.category);
  const socialShape = coordinatedSocialShape(preset.category, socialStyle);
  const socialSurfaceColor = coordinatedSocialSurfaceColor(socialShape, preset.socialIconColor);
  return {
    ...preset,
    socialStyle,
    socialShape,
    socialSurfaceColor,
    socialBorderColor: socialShape === "icons" ? null : preset.socialIconColor ?? "#D1D5DB",
    linkAppearance: { ...applyCreatorLinkItemStyle(preset.linkAppearance, style), shape },
  };
});

export const CREATOR_LINK_ONBOARDING_PRESETS: readonly CreatorLinkOnboardingPreset[] = LINK_DESIGN_PRESETS.map((preset) => ({ ...preset, backgroundPresetKey: preset.backgroundId }));
export function getLinkDesignPresets(category?: LinkDesignPresetCategory | null): readonly CreatorLinkOnboardingPreset[] {
  return category ? CREATOR_LINK_ONBOARDING_PRESETS.filter((preset) => preset.category === category) : CREATOR_LINK_ONBOARDING_PRESETS;
}
export function getAvailableLinkDesignPresetCategories(presets: readonly Pick<LinkDesignPreset, "category">[] = CREATOR_LINK_ONBOARDING_PRESETS): readonly LinkDesignPresetCategory[] {
  return LINK_DESIGN_PRESET_CATEGORIES.filter((category) => presets.some((preset) => preset.category === category));
}
export type LinkDesignPage = { themeKey: CreatorLinkTheme; accentColor: string | null; displayNameColor: string | null; buttonStyle: CreatorLinkButtonStyle; fontStyle: CreatorLinkFontStyle; coverUrl?: string | null };
export type LinkDesignItem = { metadata: CreatorLinkItemAppearance };

export function applyLinkDesignPreset<TPage extends LinkDesignPage, TSocial extends LinkDesignItem, TLink extends LinkDesignItem>(preset: LinkDesignPreset, state: { page: TPage; socials: readonly TSocial[]; links: readonly TLink[] }) {
  const page = { ...state.page, ...preset.page, coverUrl: null } as Omit<TPage, keyof LinkDesignPage> & LinkDesignPage;
  return {
    page,
    socials: state.socials.map((item) => ({ ...item, metadata: { ...item.metadata, iconColor: preset.socialIconColor, socialStyle: preset.socialStyle, socialSurface: undefined, socialShape: preset.socialShape, surfaceColor: preset.socialSurfaceColor, borderColor: preset.socialBorderColor } })),
    links: state.links.map((item) => ({ ...item, metadata: { ...item.metadata, ...preset.linkAppearance } })),
  };
}

function sameAppearance(left: CreatorLinkItemAppearance, right: CreatorLinkItemAppearance) {
  const a = normalizeCreatorLinkItemAppearance(left);
  const b = normalizeCreatorLinkItemAppearance(right);
  return a.layout === b.layout && a.surface === b.surface && a.finish === b.finish && a.color === b.color && a.depth === b.depth && a.iconColor === b.iconColor && a.shape === b.shape && a.style === b.style && a.socialStyle === b.socialStyle && a.socialSurface === b.socialSurface && a.socialShape === b.socialShape && a.surfaceColor === b.surfaceColor && a.borderColor === b.borderColor;
}

export function matchesLinkDesignPreset(preset: LinkDesignPreset, state: { page: LinkDesignPage; socials: readonly LinkDesignItem[]; links: readonly LinkDesignItem[] }) {
  return !state.page.coverUrl && preset.page.themeKey === state.page.themeKey && preset.page.accentColor === state.page.accentColor && preset.page.displayNameColor === state.page.displayNameColor && preset.page.buttonStyle === state.page.buttonStyle && preset.page.fontStyle === state.page.fontStyle
    && state.socials.every((item) => { const appearance = normalizeCreatorLinkItemAppearance(item.metadata); return appearance.iconColor === preset.socialIconColor && (appearance.socialStyle ?? "icons") === preset.socialStyle && appearance.socialSurface === undefined && appearance.socialShape === preset.socialShape && appearance.surfaceColor === preset.socialSurfaceColor && appearance.borderColor === preset.socialBorderColor; })
    && state.links.every((item) => sameAppearance(item.metadata, preset.linkAppearance));
}

export function findMatchingLinkDesignPreset(state: { page: LinkDesignPage; socials?: readonly LinkDesignItem[]; links?: readonly LinkDesignItem[] }) {
  return LINK_DESIGN_PRESETS.find((preset) => matchesLinkDesignPreset(preset, { page: state.page, socials: state.socials ?? [], links: state.links ?? [] })) ?? null;
}

export function findLinkDesignPresetByPageAppearance(page: LinkDesignPage) {
  return LINK_DESIGN_PRESETS.find((preset) => preset.page.themeKey === page.themeKey && preset.page.accentColor === page.accentColor && preset.page.displayNameColor === page.displayNameColor && preset.page.buttonStyle === page.buttonStyle && preset.page.fontStyle === page.fontStyle) ?? null;
}

export function findLinkDesignBackgroundPreset(values: { themeKey: CreatorLinkTheme; accentColor: string | null; buttonStyle?: CreatorLinkButtonStyle; fontStyle?: CreatorLinkFontStyle }) {
  return findCreatorLinkBackgroundPreset(values);
}

export function findLinkDesignBackgroundById(id: string): CreatorLinkBackgroundPreset | null {
  return CREATOR_LINK_BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function matchesLinkDesignPresetBackground(preset: LinkDesignPreset, page: LinkDesignPage): boolean {
  if (page.coverUrl) return page.coverUrl === `trendre-background:${preset.backgroundId}`;
  return findLinkDesignBackgroundPreset(page)?.id === preset.backgroundId;
}

export function findMatchingLinkDesignBackgroundPreset(page: LinkDesignPage): LinkDesignPreset | null {
  return LINK_DESIGN_PRESETS.find((preset) => matchesLinkDesignPresetBackground(preset, page)) ?? null;
}

export type { CreatorLinkBackgroundPreset };
