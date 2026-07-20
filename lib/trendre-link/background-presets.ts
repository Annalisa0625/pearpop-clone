import type { CreatorLinkButtonStyle, CreatorLinkFontStyle, CreatorLinkTheme } from "./constants";

export type CreatorLinkBackgroundPreset = {
  name: string;
  group: "solid" | "gradient" | "metallic";
  themeKey: CreatorLinkTheme;
  accentColor: string;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
  background: string;
  foreground: "light" | "dark";
};

export const CREATOR_LINK_BACKGROUND_PRESETS: readonly CreatorLinkBackgroundPreset[] = [
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
  { name: "Sunset Silk", group: "gradient", themeKey: "soft-ivory", accentColor: "#F28C79", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(145deg, #F7B2C1 0%, #F18F79 52%, #EEAC69 100%)", foreground: "dark" },
  { name: "Aurora", group: "gradient", themeKey: "night-purple", accentColor: "#786FD6", buttonStyle: "glass", fontStyle: "modern", background: "linear-gradient(145deg, #916ECC 0%, #607CD0 58%, #63B7C2 100%)", foreground: "light" },
  { name: "Ocean Glass", group: "gradient", themeKey: "minimal-black", accentColor: "#398FC5", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(145deg, #204D8D 0%, #287DB5 52%, #55C5CF 100%)", foreground: "light" },
  { name: "Berry Velvet", group: "gradient", themeKey: "night-purple", accentColor: "#7F315F", buttonStyle: "pill", fontStyle: "serif", background: "linear-gradient(145deg, #6F203F 0%, #7C2C5E 50%, #48236A 100%)", foreground: "light" },
  { name: "Lavender Mist", group: "gradient", themeKey: "soft-ivory", accentColor: "#AAA2D1", buttonStyle: "rounded", fontStyle: "soft", background: "linear-gradient(145deg, #DCD6EE 0%, #F7F4F5 52%, #BFC8D8 100%)", foreground: "dark" },
  { name: "Emerald Night", group: "gradient", themeKey: "minimal-black", accentColor: "#2B7868", buttonStyle: "square", fontStyle: "modern", background: "linear-gradient(145deg, #123C35 0%, #1E7062 52%, #252B2C 100%)", foreground: "light" },
  { name: "Champagne Glow", group: "gradient", themeKey: "natural-beige", accentColor: "#D5B981", buttonStyle: "pill", fontStyle: "serif", background: "linear-gradient(145deg, #FFF9EC 0%, #E8D3AA 48%, #FAF4E8 100%)", foreground: "dark" },
  { name: "Rose Dusk", group: "gradient", themeKey: "night-purple", accentColor: "#A45B72", buttonStyle: "rounded", fontStyle: "soft", background: "linear-gradient(145deg, #C88999 0%, #946079 52%, #5D354D 100%)", foreground: "light" },
  { name: "Champagne Gold", group: "metallic", themeKey: "natural-beige", accentColor: "#C8A86B", buttonStyle: "glass", fontStyle: "serif", background: "linear-gradient(135deg, #B99961 0%, #F6E8BE 32%, #C8A86B 60%, #FFF4D3 100%)", foreground: "dark" },
  { name: "Rose Gold", group: "metallic", themeKey: "soft-ivory", accentColor: "#B97A70", buttonStyle: "glass", fontStyle: "soft", background: "linear-gradient(135deg, #9F6A61 0%, #E8BCAE 34%, #B97A70 62%, #F3D5C8 100%)", foreground: "dark" },
  { name: "Brushed Silver", group: "metallic", themeKey: "soft-ivory", accentColor: "#A8ADB3", buttonStyle: "square", fontStyle: "modern", background: "linear-gradient(105deg, #A7ACB2 0%, #F4F5F6 34%, #8F969D 57%, #D9DDE0 100%)", foreground: "dark" },
  { name: "Titanium", group: "metallic", themeKey: "minimal-black", accentColor: "#64717E", buttonStyle: "glass", fontStyle: "modern", background: "linear-gradient(135deg, #303943 0%, #7D8994 38%, #46515C 66%, #98A1A9 100%)", foreground: "light" },
  { name: "Graphite", group: "metallic", themeKey: "minimal-black", accentColor: "#4B4E54", buttonStyle: "square", fontStyle: "bold", background: "linear-gradient(135deg, #17181B 0%, #4C5056 36%, #24262A 68%, #676B71 100%)", foreground: "light" },
  { name: "Bronze", group: "metallic", themeKey: "natural-beige", accentColor: "#916B47", buttonStyle: "rounded", fontStyle: "serif", background: "linear-gradient(135deg, #513924 0%, #B98A5A 38%, #765036 66%, #D0A475 100%)", foreground: "light" },
] as const;

export function findCreatorLinkBackgroundPreset(values: {
  themeKey: CreatorLinkTheme;
  accentColor: string | null;
  buttonStyle: CreatorLinkButtonStyle;
  fontStyle: CreatorLinkFontStyle;
}) {
  return CREATOR_LINK_BACKGROUND_PRESETS.find((preset) =>
    preset.themeKey === values.themeKey
    && preset.accentColor === values.accentColor
    && preset.buttonStyle === values.buttonStyle
    && preset.fontStyle === values.fontStyle
  ) ?? null;
}
