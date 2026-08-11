import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";

export type CreatorLinkBackgroundPreset = {
  /** Stable catalog identifier. This is not persisted in Phase 1. */
  id: string;
  name: string;
  group: "solid" | "gradient" | "pattern" | "texture" | "metallic";
  themeKey: CreatorLinkTheme;
  accentColor: string;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
  background: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundScale?: number;
  backgroundOverlay?: string;
  backgroundFilter?: string;
  foreground: "light" | "dark";
};

export type CreatorLinkBackgroundPreviewDefinition = {
  background: string;
  foreground: "light" | "dark";
  imageUrl: string | null;
  imagePosition: string;
  imageFilter?: string;
  imageScale?: number;
  overlay?: string;
};

function imageBackground(id: string, name: string, group: CreatorLinkBackgroundPreset["group"], themeKey: CreatorLinkTheme, accentColor: string, buttonStyle: CreatorLinkButtonStyle, fontStyle: CreatorLinkFontStyle, foreground: CreatorLinkBackgroundPreset["foreground"], backgroundImage: string, backgroundOverlay?: string, backgroundPosition = "center"): CreatorLinkBackgroundPreset {
  return { id, name, group, themeKey, accentColor, buttonStyle, fontStyle, background: accentColor, backgroundImage, backgroundPosition, backgroundOverlay, foreground };
}

function cssBackground(id: string, name: string, accentColor: string, background: string): CreatorLinkBackgroundPreset {
  return { id, name, group: "pattern", themeKey: "soft-ivory", accentColor, buttonStyle: "rounded", fontStyle: "soft", background, foreground: "dark" };
}

const BACKGROUND_PRESET_DEFINITIONS = [
  { name: "Snow", group: "solid", themeKey: "soft-ivory", accentColor: "#F4F5F7", buttonStyle: "rounded", fontStyle: "modern", background: "#F4F5F7", foreground: "dark" },
  { name: "Ivory", group: "solid", themeKey: "soft-ivory", accentColor: "#F7EFE1", buttonStyle: "pill", fontStyle: "soft", background: "#F7EFE1", foreground: "dark" },
  { name: "Sand", group: "solid", themeKey: "natural-beige", accentColor: "#D8C8AE", buttonStyle: "rounded", fontStyle: "soft", background: "#D8C8AE", foreground: "dark" },
  { name: "Mocha", group: "solid", themeKey: "natural-beige", accentColor: "#806B57", buttonStyle: "square", fontStyle: "serif", background: "#806B57", foreground: "light" },
  { name: "Blush", group: "solid", themeKey: "soft-ivory", accentColor: "#F2D8DC", buttonStyle: "rounded", fontStyle: "soft", background: "#F2D8DC", foreground: "dark" },
  { name: "Rose", group: "solid", themeKey: "soft-ivory", accentColor: "#C8798A", buttonStyle: "square", fontStyle: "modern", background: "#C8798A", foreground: "light" },
  { name: "Sky", group: "solid", themeKey: "soft-ivory", accentColor: "#C9DDF0", buttonStyle: "glass", fontStyle: "modern", background: "#C9DDF0", foreground: "dark" },
  { name: "Mint", group: "solid", themeKey: "natural-beige", accentColor: "#C8E0D2", buttonStyle: "pill", fontStyle: "modern", background: "#C8E0D2", foreground: "dark" },
  { name: "Lavender", group: "solid", themeKey: "night-purple", accentColor: "#CFC7EA", buttonStyle: "rounded", fontStyle: "serif", background: "#CFC7EA", foreground: "dark" },
  { name: "Midnight", group: "solid", themeKey: "minimal-black", accentColor: "#18171B", buttonStyle: "square", fontStyle: "bold", background: "#18171B", foreground: "light" },
  { name: "Charcoal", group: "solid", themeKey: "minimal-black", accentColor: "#303036", buttonStyle: "rounded", fontStyle: "modern", background: "#303036", foreground: "light" },
  { name: "Stone Gray", group: "solid", themeKey: "soft-ivory", accentColor: "#D6D3D1", buttonStyle: "rounded", fontStyle: "modern", background: "#D6D3D1", foreground: "dark" },
  { name: "Garnet", group: "solid", themeKey: "minimal-black", accentColor: "#B54C58", buttonStyle: "rounded", fontStyle: "bold", background: "#B54C58", foreground: "light" },
  { name: "Terracotta", group: "solid", themeKey: "natural-beige", accentColor: "#D4815F", buttonStyle: "pill", fontStyle: "soft", background: "#D4815F", foreground: "dark" },
  { name: "Butter", group: "solid", themeKey: "natural-beige", accentColor: "#E6CB78", buttonStyle: "rounded", fontStyle: "soft", background: "#E6CB78", foreground: "dark" },
  { name: "Ink Black", group: "solid", themeKey: "minimal-black", accentColor: "#080808", buttonStyle: "square", fontStyle: "bold", background: "#080808", foreground: "light" },
  { name: "Sunset Silk", group: "gradient", themeKey: "soft-ivory", accentColor: "#F28C79", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(145deg, #F7B2C1 0%, #F18F79 52%, #EEAC69 100%)", foreground: "dark" },
  { name: "Aurora", group: "gradient", themeKey: "night-purple", accentColor: "#786FD6", buttonStyle: "glass", fontStyle: "modern", background: "linear-gradient(145deg, #916ECC 0%, #607CD0 58%, #63B7C2 100%)", foreground: "light" },
  { name: "Ocean Glass", group: "gradient", themeKey: "minimal-black", accentColor: "#398FC5", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(145deg, #204D8D 0%, #287DB5 52%, #55C5CF 100%)", foreground: "light" },
  { name: "Berry Velvet", group: "gradient", themeKey: "night-purple", accentColor: "#7F315F", buttonStyle: "pill", fontStyle: "serif", background: "linear-gradient(145deg, #6F203F 0%, #7C2C5E 50%, #48236A 100%)", foreground: "light" },
  { name: "Lavender Mist", group: "gradient", themeKey: "soft-ivory", accentColor: "#AAA2D1", buttonStyle: "rounded", fontStyle: "soft", background: "linear-gradient(145deg, #DCD6EE 0%, #F7F4F5 52%, #BFC8D8 100%)", foreground: "dark" },
  { name: "Emerald Night", group: "gradient", themeKey: "minimal-black", accentColor: "#2B7868", buttonStyle: "square", fontStyle: "modern", background: "linear-gradient(145deg, #123C35 0%, #1E7062 52%, #252B2C 100%)", foreground: "light" },
  { name: "Champagne Glow", group: "gradient", themeKey: "natural-beige", accentColor: "#D5B981", buttonStyle: "pill", fontStyle: "serif", background: "linear-gradient(145deg, #FFF9EC 0%, #E8D3AA 48%, #FAF4E8 100%)", foreground: "dark" },
  { name: "Rose Dusk", group: "gradient", themeKey: "night-purple", accentColor: "#A45B72", buttonStyle: "rounded", fontStyle: "soft", background: "linear-gradient(145deg, #C88999 0%, #946079 52%, #5D354D 100%)", foreground: "light" },
  { name: "Magenta Orbit", group: "gradient", themeKey: "night-purple", accentColor: "#B64EA7", buttonStyle: "pill", fontStyle: "bold", background: "linear-gradient(145deg, #6138B8 0%, #B64EA7 52%, #F17FAE 100%)", foreground: "light" },
  { name: "Champagne Gold", group: "metallic", themeKey: "natural-beige", accentColor: "#C8A86B", buttonStyle: "glass", fontStyle: "serif", background: "linear-gradient(135deg, #B99961 0%, #F6E8BE 32%, #C8A86B 60%, #FFF4D3 100%)", foreground: "dark" },
  { name: "Rose Gold", group: "metallic", themeKey: "soft-ivory", accentColor: "#B97A70", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(135deg, #9F6A61 0%, #E8BCAE 34%, #B97A70 62%, #F3D5C8 100%)", foreground: "dark" },
  { name: "Brushed Silver", group: "metallic", themeKey: "soft-ivory", accentColor: "#A8ADB3", buttonStyle: "square", fontStyle: "modern", background: "linear-gradient(105deg, #A7ACB2 0%, #F4F5F6 34%, #8F969D 57%, #D9DDE0 100%)", foreground: "dark" },
  { name: "Titanium", group: "metallic", themeKey: "minimal-black", accentColor: "#64717E", buttonStyle: "glass", fontStyle: "modern", background: "linear-gradient(135deg, #303943 0%, #7D8994 38%, #46515C 66%, #98A1A9 100%)", foreground: "light" },
  { name: "Graphite", group: "metallic", themeKey: "minimal-black", accentColor: "#4B4E54", buttonStyle: "square", fontStyle: "bold", background: "linear-gradient(135deg, #17181B 0%, #4C5056 36%, #24262A 68%, #676B71 100%)", foreground: "light" },
  { name: "Bronze", group: "metallic", themeKey: "natural-beige", accentColor: "#916B47", buttonStyle: "rounded", fontStyle: "serif", background: "linear-gradient(135deg, #513924 0%, #B98A5A 38%, #765036 66%, #D0A475 100%)", foreground: "light" },
  { name: "Flame", group: "gradient", themeKey: "night-purple", accentColor: "#E76042", buttonStyle: "rounded", fontStyle: "bold", background: "radial-gradient(circle at 72% 18%, rgba(255,224,121,.82), transparent 23%), linear-gradient(145deg, #7A1629 0%, #E54335 48%, #FF9C45 100%)", foreground: "light" },
  { name: "Leopard", group: "pattern", themeKey: "natural-beige", accentColor: "#B98552", buttonStyle: "pill", fontStyle: "serif", background: "#BDE3FF", backgroundImage: "/trendre-link/backgrounds/blue-leopard.jpg", backgroundPosition: "50% 45%", backgroundScale: 1.03, backgroundOverlay: "radial-gradient(ellipse at 50% 24%,rgba(224,244,255,.62),transparent 27%),linear-gradient(rgba(255,255,255,.04),rgba(39,116,177,.08))", backgroundFilter: "saturate(.92) contrast(1.05)", foreground: "dark" },
  { name: "Fine Grid", group: "pattern", themeKey: "minimal-black", accentColor: "#26313B", buttonStyle: "square", fontStyle: "modern", background: "linear-gradient(rgba(117,215,229,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(117,215,229,.13) 1px, transparent 1px), linear-gradient(145deg,#182028,#303D47)", foreground: "light" },
  { name: "Dots", group: "pattern", themeKey: "soft-ivory", accentColor: "#F3C65D", buttonStyle: "pill", fontStyle: "bold", background: "radial-gradient(circle, rgba(91,43,99,.38) 1.6px, transparent 1.8px), linear-gradient(145deg,#FFE49A,#F4BD4D)", foreground: "dark" },
  { name: "Candy Checker", group: "pattern", themeKey: "soft-ivory", accentColor: "#F09BC2", buttonStyle: "pill", fontStyle: "soft", background: "linear-gradient(45deg, rgba(255,255,255,.32) 25%, transparent 25% 75%, rgba(255,255,255,.32) 75%), linear-gradient(45deg, rgba(255,255,255,.32) 25%, #F09BC2 25% 75%, rgba(255,255,255,.32) 75%)", foreground: "dark" },
  { name: "Bold Grid", group: "pattern", themeKey: "minimal-black", accentColor: "#39404C", buttonStyle: "square", fontStyle: "bold", background: "linear-gradient(rgba(255,255,255,.16) 3px, transparent 3px), linear-gradient(90deg, rgba(255,255,255,.16) 3px, transparent 3px), #252A33", foreground: "light" },
  { name: "Mineral Grain", group: "pattern", themeKey: "natural-beige", accentColor: "#B8AA98", buttonStyle: "rounded", fontStyle: "soft", background: "radial-gradient(circle at 20% 30%, rgba(50,42,36,.08) 0 1px, transparent 1.4px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.30) 0 1px, transparent 1.5px), #B8AA98", foreground: "dark" },
  { name: "Organic Wave", group: "pattern", themeKey: "soft-ivory", accentColor: "#91C9C0", buttonStyle: "pill", fontStyle: "soft", background: "radial-gradient(ellipse at 0% 20%, transparent 0 28%, rgba(255,255,255,.40) 29% 35%, transparent 36%), radial-gradient(ellipse at 100% 80%, transparent 0 30%, rgba(42,103,95,.18) 31% 38%, transparent 39%), linear-gradient(145deg,#BEE4DB,#78B8AE)", foreground: "dark" },
  { name: "Afterglow", group: "texture", themeKey: "night-purple", accentColor: "#292052", buttonStyle: "glass", fontStyle: "serif", background: "radial-gradient(circle at 22% 18%, rgba(209,149,255,.42), transparent 34%), radial-gradient(circle at 78% 78%, rgba(70,152,255,.28), transparent 38%), linear-gradient(160deg,#130F2B,#292052 55%,#101B3B)", foreground: "light" },
  { name: "Editorial Paper", group: "texture", themeKey: "natural-beige", accentColor: "#E8D3AA", buttonStyle: "square", fontStyle: "serif", background: "repeating-linear-gradient(0deg, rgba(64,49,35,.025) 0 1px, transparent 1px 4px), linear-gradient(145deg,#F8EED9,#E8D3AA)", foreground: "dark" },
  { name: "Walnut", group: "texture", themeKey: "natural-beige", accentColor: "#76513B", buttonStyle: "rounded", fontStyle: "serif", background: "repeating-linear-gradient(96deg, rgba(255,255,255,.035) 0 2px, transparent 2px 13px), repeating-linear-gradient(84deg, rgba(38,20,12,.12) 0 1px, transparent 1px 21px), linear-gradient(145deg,#4E3022,#91664A)", foreground: "light" },
  { name: "Star Field", group: "texture", themeKey: "minimal-black", accentColor: "#171D45", buttonStyle: "glass", fontStyle: "modern", background: "radial-gradient(circle at 18% 24%, #FFF 0 1px, transparent 1.5px), radial-gradient(circle at 74% 32%, rgba(255,255,255,.75) 0 1px, transparent 1.5px), radial-gradient(circle at 43% 78%, rgba(166,191,255,.8) 0 1.5px, transparent 2px), linear-gradient(160deg,#080B20,#171D45 58%,#29174A)", foreground: "light" },
  { name: "Botanical Ivory", group: "pattern", themeKey: "natural-beige", accentColor: "#EEE5D2", buttonStyle: "rounded", fontStyle: "serif", background: "#F8F6EF", backgroundImage: "/trendre-link/backgrounds/botanical-gold-leaves.jpg", backgroundPosition: "50% 50%", backgroundOverlay: "linear-gradient(rgba(255,252,244,.08),rgba(255,252,244,.08))", backgroundFilter: "saturate(.86) contrast(.98)", foreground: "dark" },
  { name: "Tropical Leaf", group: "pattern", themeKey: "minimal-black", accentColor: "#135A45", buttonStyle: "pill", fontStyle: "bold", background: "#083E33", backgroundImage: "/trendre-link/backgrounds/botanical-gold-leaves.jpg", backgroundPosition: "18% 44%", backgroundScale: 1.18, backgroundOverlay: "linear-gradient(rgba(0,45,36,.58),rgba(0,53,40,.7))", backgroundFilter: "saturate(1.16) contrast(1.08) brightness(.78)", foreground: "light" },
  { name: "Sage Garden", group: "pattern", themeKey: "natural-beige", accentColor: "#BFCDB4", buttonStyle: "rounded", fontStyle: "soft", background: "#DCE5D4", backgroundImage: "/trendre-link/backgrounds/botanical-gold-leaves.jpg", backgroundPosition: "82% 54%", backgroundScale: 1.08, backgroundOverlay: "linear-gradient(rgba(218,231,210,.42),rgba(235,238,221,.5))", backgroundFilter: "saturate(.66) contrast(.92)", foreground: "dark" },
  { name: "Deep Starfield", group: "texture", themeKey: "minimal-black", accentColor: "#101A3C", buttonStyle: "glass", fontStyle: "modern", background: "#06112D", backgroundImage: "/trendre-link/backgrounds/blue-starfield.jpg", backgroundPosition: "50% 42%", backgroundScale: 1.04, backgroundOverlay: "linear-gradient(rgba(2,8,26,.12),rgba(2,7,22,.28))", backgroundFilter: "saturate(1.06) contrast(1.08) brightness(.9)", foreground: "light" },
  { name: "Purple Galaxy", group: "texture", themeKey: "night-purple", accentColor: "#5A3A91", buttonStyle: "glass", fontStyle: "bold", background: "#180B3D", backgroundImage: "/trendre-link/backgrounds/blue-starfield.jpg", backgroundPosition: "44% 62%", backgroundScale: 1.14, backgroundOverlay: "linear-gradient(145deg,rgba(81,15,113,.45),rgba(37,16,104,.28) 48%,rgba(170,36,132,.24))", backgroundFilter: "saturate(1.28) hue-rotate(24deg) contrast(1.08) brightness(.84)", foreground: "light" },
  { name: "Moonlight", group: "texture", themeKey: "minimal-black", accentColor: "#18243F", buttonStyle: "pill", fontStyle: "serif", background: "#071329", backgroundImage: "/trendre-link/backgrounds/blue-starfield.jpg", backgroundPosition: "50% 14%", backgroundScale: 1.26, backgroundOverlay: "radial-gradient(circle at 78% 14%,rgba(235,244,255,.28),transparent 18%),linear-gradient(rgba(4,13,34,.3),rgba(5,17,39,.55))", backgroundFilter: "saturate(.68) contrast(1.08) brightness(.72)", foreground: "light" },
  { name: "Pink Prism", group: "gradient", themeKey: "night-purple", accentColor: "#C754B7", buttonStyle: "pill", fontStyle: "soft", background: "radial-gradient(circle at 18% 16%,rgba(255,210,238,.8),transparent 31%),radial-gradient(circle at 82% 78%,rgba(110,72,220,.55),transparent 36%),linear-gradient(145deg,#F16BA6,#A64BC4 54%,#613DB6)", foreground: "light" },
  { name: "Blue Current", group: "gradient", themeKey: "minimal-black", accentColor: "#3B9BDE", buttonStyle: "glass", fontStyle: "modern", background: "radial-gradient(circle at 24% 22%,rgba(113,249,255,.62),transparent 30%),radial-gradient(circle at 76% 72%,rgba(43,92,218,.5),transparent 38%),linear-gradient(150deg,#27C8D2,#247BD3 57%,#16469C)", foreground: "light" },
  { name: "Aqua Mint", group: "gradient", themeKey: "natural-beige", accentColor: "#51BFAE", buttonStyle: "pill", fontStyle: "soft", background: "radial-gradient(circle at 78% 18%,rgba(224,255,238,.75),transparent 32%),radial-gradient(circle at 18% 82%,rgba(28,151,165,.3),transparent 38%),linear-gradient(145deg,#B9F0D2,#67D5BE 52%,#37AFC3)", foreground: "dark" },
  { name: "Ember", group: "gradient", themeKey: "night-purple", accentColor: "#E84B32", buttonStyle: "rounded", fontStyle: "bold", background: "radial-gradient(circle at 70% 18%,rgba(255,205,91,.78),transparent 27%),radial-gradient(circle at 22% 78%,rgba(138,0,40,.42),transparent 39%),linear-gradient(145deg,#FF982E,#E84331 52%,#A41636)", foreground: "light" },
  { name: "Indigo Bloom", group: "gradient", themeKey: "night-purple", accentColor: "#5749B8", buttonStyle: "square", fontStyle: "serif", background: "radial-gradient(circle at 20% 72%,rgba(168,102,255,.56),transparent 36%),radial-gradient(circle at 78% 22%,rgba(93,145,255,.46),transparent 34%),linear-gradient(150deg,#1D2864,#4E3A9D 54%,#762F91)", foreground: "light" },
  { name: "Peach Rose", group: "gradient", themeKey: "soft-ivory", accentColor: "#E78D91", buttonStyle: "rounded", fontStyle: "serif", background: "radial-gradient(circle at 22% 18%,rgba(255,241,215,.82),transparent 32%),radial-gradient(circle at 78% 74%,rgba(190,78,109,.28),transparent 38%),linear-gradient(145deg,#F8C69D,#ED9296 55%,#C76583)", foreground: "dark" },
  { name: "Micro Dots", group: "pattern", themeKey: "natural-beige", accentColor: "#D5C9A8", buttonStyle: "rounded", fontStyle: "modern", background: "radial-gradient(circle,rgba(64,55,42,.22) 0 .8px,transparent 1px),linear-gradient(145deg,#E9E1CB,#D5C9A8)", foreground: "dark" },
  { name: "Large Dots", group: "pattern", themeKey: "soft-ivory", accentColor: "#E8A8B3", buttonStyle: "pill", fontStyle: "bold", background: "radial-gradient(circle at 18% 20%,rgba(113,55,98,.24) 0 8%,transparent 8.5%),radial-gradient(circle at 75% 62%,rgba(255,255,255,.35) 0 11%,transparent 11.5%),radial-gradient(circle at 30% 88%,rgba(140,67,112,.18) 0 6%,transparent 6.5%),linear-gradient(145deg,#F3CBD1,#E8A8B3)", foreground: "dark" },
  { name: "Abstract Geometry", group: "pattern", themeKey: "night-purple", accentColor: "#7871A8", buttonStyle: "square", fontStyle: "bold", background: "linear-gradient(135deg,transparent 0 44%,rgba(255,255,255,.12) 44% 52%,transparent 52%),linear-gradient(45deg,rgba(39,31,76,.24) 0 18%,transparent 18% 72%,rgba(234,180,255,.13) 72%),linear-gradient(145deg,#514A80,#8A79B8)", foreground: "light" },
  imageBackground("animal-python-noir", "Python Noir", "pattern", "minimal-black", "#17151A", "pill", "serif", "light", "/trendre-link/backgrounds/animal-python-noir.jpg", "linear-gradient(rgba(8,7,10,.08),rgba(8,7,10,.12))"),
  imageBackground("animal-zebra-mono", "Zebra Mono", "pattern", "soft-ivory", "#D7D7D5", "square", "bold", "dark", "/trendre-link/backgrounds/animal-zebra-mono.jpg", "linear-gradient(rgba(255,255,255,.02),rgba(255,255,255,.02))"),
  imageBackground("animal-zebra-midnight", "Zebra Midnight", "pattern", "minimal-black", "#17223F", "glass", "bold", "light", "/trendre-link/backgrounds/animal-zebra-midnight.jpg", "linear-gradient(rgba(4,8,18,.06),rgba(4,8,18,.12))"),
  imageBackground("animal-zebra-pink", "Zebra Pink", "pattern", "soft-ivory", "#E7A8C0", "pill", "soft", "dark", "/trendre-link/backgrounds/animal-zebra-pink.jpg"),
  imageBackground("animal-leopard-classic", "Leopard Classic", "pattern", "natural-beige", "#B88B5A", "pill", "serif", "dark", "/trendre-link/backgrounds/animal-leopard-classic.jpg", "linear-gradient(rgba(255,250,240,.03),rgba(255,250,240,.03))"),
  imageBackground("animal-leopard-mono", "Leopard Mono", "pattern", "minimal-black", "#77797D", "square", "modern", "light", "/trendre-link/backgrounds/animal-leopard-mono.jpg", "linear-gradient(rgba(10,10,12,.06),rgba(10,10,12,.1))"),
  imageBackground("animal-leopard-pink", "Leopard Pink", "pattern", "soft-ivory", "#D987A4", "rounded", "soft", "dark", "/trendre-link/backgrounds/animal-leopard-pink.jpg"),
  imageBackground("animal-leopard-ice", "Leopard Ice", "pattern", "soft-ivory", "#9DC9DD", "rounded", "modern", "dark", "/trendre-link/backgrounds/animal-leopard-ice.jpg"),
  imageBackground("pattern-midnight-ornament", "Midnight Ornament", "pattern", "minimal-black", "#201B27", "pill", "serif", "light", "/trendre-link/backgrounds/pattern-midnight-ornament.jpg", "linear-gradient(rgba(8,7,10,.07),rgba(8,7,10,.12))"),
  imageBackground("pattern-brick", "Brick", "texture", "natural-beige", "#9B5145", "square", "bold", "light", "/trendre-link/backgrounds/pattern-brick.jpg", "linear-gradient(rgba(35,12,10,.04),rgba(35,12,10,.1))"),
  imageBackground("pattern-vintage-wood", "Vintage Wood", "texture", "natural-beige", "#76523D", "rounded", "serif", "light", "/trendre-link/backgrounds/pattern-vintage-wood.jpg", "linear-gradient(rgba(24,13,7,.03),rgba(24,13,7,.1))"),
  imageBackground("pattern-navy-plaid", "Navy Plaid", "pattern", "minimal-black", "#263556", "square", "serif", "light", "/trendre-link/backgrounds/pattern-navy-plaid.jpg", "linear-gradient(rgba(5,10,24,.04),rgba(5,10,24,.1))"),
  imageBackground("pattern-white-marble", "White Marble", "texture", "soft-ivory", "#E5E2DE", "rounded", "serif", "dark", "/trendre-link/backgrounds/pattern-white-marble.jpg"),
  imageBackground("pattern-liquid-gold", "Liquid Gold", "texture", "minimal-black", "#AD8A48", "glass", "serif", "light", "/trendre-link/backgrounds/pattern-liquid-gold.jpg", "linear-gradient(rgba(10,8,4,.05),rgba(10,8,4,.1))"),
  imageBackground("pattern-paisley-noir", "Paisley Noir", "pattern", "minimal-black", "#2A292D", "square", "bold", "light", "/trendre-link/backgrounds/pattern-paisley-noir.jpg", "linear-gradient(rgba(7,7,8,.04),rgba(7,7,8,.1))"),
  imageBackground("pattern-paisley-blue", "Paisley Blue", "pattern", "natural-beige", "#587799", "rounded", "serif", "dark", "/trendre-link/backgrounds/pattern-paisley-blue.jpg", "linear-gradient(rgba(250,247,238,.03),rgba(250,247,238,.03))"),
  imageBackground("pattern-aqua-silk", "Aqua Silk", "texture", "soft-ivory", "#75BFC0", "pill", "soft", "dark", "/trendre-link/backgrounds/pattern-aqua-silk.jpg"),
  imageBackground("pattern-silver-marble", "Silver Marble", "texture", "soft-ivory", "#A7ACB2", "square", "modern", "dark", "/trendre-link/backgrounds/pattern-silver-marble.jpg"),
  imageBackground("pattern-retro-daisy", "Retro Daisy", "pattern", "natural-beige", "#A37B58", "pill", "soft", "dark", "/trendre-link/backgrounds/pattern-retro-daisy.jpg", "linear-gradient(rgba(255,249,237,.02),rgba(255,249,237,.02))"),
  imageBackground("pattern-bandana-black", "Bandana Black", "pattern", "minimal-black", "#19191C", "square", "bold", "light", "/trendre-link/backgrounds/pattern-bandana-black.jpg", "linear-gradient(rgba(4,4,5,.04),rgba(4,4,5,.1))"),
  imageBackground("emotion-blue-hour", "Blue Hour", "texture", "night-purple", "#556B99", "glass", "soft", "light", "/trendre-link/backgrounds/emotion-blue-hour.jpg", "linear-gradient(rgba(15,18,42,.04),rgba(15,18,42,.1))"),
  imageBackground("emotion-dreamy-coast", "Dreamy Coast", "texture", "soft-ivory", "#D7A8B8", "pill", "soft", "dark", "/trendre-link/backgrounds/emotion-dreamy-coast.jpg"),
  imageBackground("emotion-burning-sunset", "Burning Sunset", "texture", "night-purple", "#B95D45", "glass", "bold", "light", "/trendre-link/backgrounds/emotion-burning-sunset.jpg", "linear-gradient(rgba(34,10,26,.04),rgba(34,10,26,.11))"),
  cssBackground("pretty-tiny-hearts", "Tiny Hearts", "#F5F4F0", "#F5F4F0 url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Cpath d='M22 29s-8-4.8-8-10.2c0-4.2 5.3-5.8 8-2.3 2.7-3.5 8-1.9 8 2.3C30 24.2 22 29 22 29Z' fill='none' stroke='%23504B4D' stroke-width='1.15'/%3E%3C/svg%3E\") repeat"),
  cssBackground("pretty-baby-argyle", "Baby Argyle", "#AFC8E8", "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Cpath d='M24 2 47 32 24 62 1 32Z' fill='%23dceaff'/%3E%3Cpath d='M72 2 95 32 72 62 49 32Z' fill='%23a8c5ea'/%3E%3Cpath d='M48 38s-6-3.6-6-7.4c0-3 4-4.2 6-1.5 2-2.7 6-1.5 6 1.5 0 3.8-6 7.4-6 7.4Z' fill='%23fff'/%3E%3C/svg%3E\") repeat, #C9DCF4"),
  cssBackground("pretty-mint-gingham", "Mint Gingham", "#B8DBCD", "#B8DBCD url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M0 0h24v48H0z' fill='%23fff' fill-opacity='.28'/%3E%3Cpath d='M0 0h48v24H0z' fill='%23fff' fill-opacity='.28'/%3E%3Cpath d='M0 0h24v24H0z' fill='%23508973' fill-opacity='.1'/%3E%3C/svg%3E\") repeat"),
  imageBackground("pretty-cloudy-wish", "Cloudy Wish", "texture", "soft-ivory", "#DDE4ED", "pill", "soft", "dark", "/trendre-link/backgrounds/pretty-cloudy-wish.jpg"),
  cssBackground("pretty-blush-hearts", "Blush Hearts", "#E9B4C2", "#F3CAD4 url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Cpath d='M26 34s-9-5.2-9-11.2c0-4.7 6-6.4 9-2.5 3-3.9 9-2.2 9 2.5C35 28.8 26 34 26 34Z' fill='%23fff4f6'/%3E%3C/svg%3E\") repeat"),
  imageBackground("pretty-bubble-love", "Bubble Love", "texture", "soft-ivory", "#8DBACF", "rounded", "soft", "dark", "/trendre-link/backgrounds/pretty-bubble-love.jpg"),
  imageBackground("nature-pastel-shore", "Pastel Shore", "texture", "soft-ivory", "#A3D4D1", "pill", "soft", "dark", "/trendre-link/backgrounds/nature-pastel-shore.jpg"),
  imageBackground("nature-deep-blue-wave", "Deep Blue Wave", "texture", "minimal-black", "#145C8D", "glass", "bold", "light", "/trendre-link/backgrounds/nature-deep-blue-wave.jpg", "linear-gradient(rgba(2,18,35,.03),rgba(2,18,35,.1))"),
  imageBackground("nature-aqua-water", "Aqua Water", "texture", "soft-ivory", "#63C8CF", "rounded", "modern", "dark", "/trendre-link/backgrounds/nature-aqua-water.jpg"),
  imageBackground("nature-forest-light", "Forest Light", "texture", "minimal-black", "#315D42", "rounded", "serif", "light", "/trendre-link/backgrounds/nature-forest-light.jpg", "linear-gradient(rgba(4,20,10,.03),rgba(4,20,10,.11))"),
  imageBackground("nature-bamboo-breeze", "Bamboo Breeze", "texture", "natural-beige", "#7FA06A", "pill", "soft", "dark", "/trendre-link/backgrounds/nature-bamboo-breeze.jpg"),
  imageBackground("nature-snow-glow", "Snow Glow", "texture", "soft-ivory", "#C7DCE9", "rounded", "soft", "dark", "/trendre-link/backgrounds/nature-snow-glow.jpg"),
  imageBackground("nature-sunset-shore", "Sunset Shore", "texture", "night-purple", "#D88A91", "glass", "soft", "light", "/trendre-link/backgrounds/nature-sunset-shore.jpg", "linear-gradient(rgba(38,16,35,.02),rgba(38,16,35,.09))"),
  imageBackground("city-neon-palms", "Neon Palms", "texture", "night-purple", "#A93B84", "glass", "bold", "light", "/trendre-link/backgrounds/city-neon-palms.jpg", "linear-gradient(rgba(20,4,24,.03),rgba(20,4,24,.1))"),
  imageBackground("city-sunset-downtown", "Sunset Downtown", "texture", "natural-beige", "#C96B44", "rounded", "bold", "dark", "/trendre-link/backgrounds/city-sunset-downtown.jpg", "linear-gradient(rgba(255,242,224,.02),rgba(255,242,224,.02))"),
  imageBackground("city-neon-crossing", "Neon Crossing", "texture", "night-purple", "#5C3E8E", "glass", "modern", "light", "/trendre-link/backgrounds/city-neon-crossing.jpg", "linear-gradient(rgba(10,4,25,.03),rgba(10,4,25,.1))"),
  imageBackground("city-autumn-avenue", "Autumn Avenue", "texture", "natural-beige", "#9A6A44", "pill", "serif", "dark", "/trendre-link/backgrounds/city-autumn-avenue.jpg", "linear-gradient(rgba(255,248,232,.03),rgba(255,248,232,.03))"),
  imageBackground("city-sunset-boulevard", "Sunset Boulevard", "texture", "night-purple", "#E17755", "rounded", "bold", "light", "/trendre-link/backgrounds/city-sunset-boulevard.jpg", "linear-gradient(rgba(40,8,25,.02),rgba(40,8,25,.09))"),
  imageBackground("city-retro-block", "Retro Block", "texture", "soft-ivory", "#4D7190", "square", "bold", "light", "/trendre-link/backgrounds/city-retro-block.jpg", "linear-gradient(rgba(8,18,28,.02),rgba(8,18,28,.09))"),
  imageBackground("city-coastal-town", "Coastal Town", "texture", "soft-ivory", "#4E9EA0", "pill", "soft", "dark", "/trendre-link/backgrounds/city-coastal-town.jpg"),
  imageBackground("city-cafe-lane", "Café Lane", "texture", "natural-beige", "#9B725A", "rounded", "serif", "dark", "/trendre-link/backgrounds/city-cafe-lane.jpg", "linear-gradient(rgba(255,250,240,.02),rgba(255,250,240,.02))"),
  imageBackground("city-tokyo-sakura", "Tokyo Sakura", "texture", "soft-ivory", "#D97E9D", "pill", "soft", "dark", "/trendre-link/backgrounds/city-tokyo-sakura.jpg"),
  imageBackground("city-tokyo-neon", "Tokyo Neon", "texture", "night-purple", "#3E2D75", "glass", "modern", "light", "/trendre-link/backgrounds/city-tokyo-neon.jpg", "linear-gradient(rgba(6,3,18,.03),rgba(6,3,18,.1))"),
] as const;

function backgroundPresetId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const CREATOR_LINK_BACKGROUND_PRESETS: readonly CreatorLinkBackgroundPreset[] = BACKGROUND_PRESET_DEFINITIONS.map((preset) => ({
  ...preset,
  id: "id" in preset ? preset.id : backgroundPresetId(preset.name),
}));

export function getCreatorLinkBackgroundPreviewDefinition(preset: CreatorLinkBackgroundPreset): CreatorLinkBackgroundPreviewDefinition {
  return {
    background: preset.background,
    foreground: preset.foreground,
    imageUrl: preset.backgroundImage ?? null,
    imagePosition: preset.backgroundPosition ?? "center",
    ...(preset.backgroundFilter ? { imageFilter: preset.backgroundFilter } : {}),
    ...(preset.backgroundScale ? { imageScale: preset.backgroundScale } : {}),
    ...(preset.backgroundOverlay ? { overlay: preset.backgroundOverlay } : {}),
  };
}

export function findCreatorLinkBackgroundPreset(values: {
  themeKey: CreatorLinkTheme;
  accentColor: string | null;
  buttonStyle?: CreatorLinkButtonStyle;
  fontStyle?: CreatorLinkFontStyle;
}) {
  return CREATOR_LINK_BACKGROUND_PRESETS.find((preset) =>
    preset.accentColor === values.accentColor
  ) ?? null;
}
