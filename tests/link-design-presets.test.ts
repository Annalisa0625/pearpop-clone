import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  LINK_DESIGN_PRESETS,
  LINK_DESIGN_PRESET_CATEGORIES,
  applyLinkDesignPreset,
  findLinkDesignBackgroundById,
  findMatchingLinkDesignPreset,
  findMatchingLinkDesignBackgroundPreset,
  findLinkDesignBackgroundPreset,
  getAvailableLinkDesignPresetCategories,
  getLinkDesignPresets,
  matchesLinkDesignPreset,
} from "../lib/trendre-link/link-design-presets.ts";
import { CREATOR_LINK_BACKGROUND_PRESETS } from "../lib/trendre-link/background-presets.ts";
import { DEFAULT_CREATOR_LINK_ITEM_APPEARANCE } from "../lib/trendre-link/item-validation.ts";

const preset = LINK_DESIGN_PRESETS[0];
const base = {
  page: { ...preset.page },
  socials: [{ metadata: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, iconColor: preset.socialIconColor, socialStyle: preset.socialStyle, socialShape: preset.socialShape, surfaceColor: preset.socialSurfaceColor, borderColor: preset.socialBorderColor } }],
  links: [{ metadata: { ...preset.linkAppearance } }],
};

test("design and background preset IDs are unique", () => {
  assert.equal(new Set(LINK_DESIGN_PRESETS.map((entry) => entry.id)).size, LINK_DESIGN_PRESETS.length);
  assert.equal(new Set(CREATOR_LINK_BACKGROUND_PRESETS.map((entry) => entry.id)).size, CREATOR_LINK_BACKGROUND_PRESETS.length);
  for (const entry of LINK_DESIGN_PRESETS) {
    assert.ok(findLinkDesignBackgroundById(entry.backgroundId));
    assert.equal(findLinkDesignBackgroundPreset(entry.page)?.id, entry.backgroundId);
  }
});

test("every preset has a valid category and optional tags remain optional", () => {
  const categories = new Set(LINK_DESIGN_PRESET_CATEGORIES);
  assert.ok(LINK_DESIGN_PRESETS.every((entry) => categories.has(entry.category)));
  assert.ok(LINK_DESIGN_PRESETS.some((entry) => entry.tags === undefined));
});

test("selectable catalog provides the final 64 presets in category order", () => {
  const expectedCounts = {
    normal: 12,
    gradient: 4,
    metal: 2,
    animal: 8,
    pattern: 12,
    emotion: 3,
    pretty: 6,
    nature: 7,
    city: 10,
  } as const;

  for (const category of LINK_DESIGN_PRESET_CATEGORIES) {
    assert.equal(getLinkDesignPresets(category).length, expectedCounts[category]);
  }
  assert.deepEqual(getLinkDesignPresets("metal").map((entry) => entry.name), ["Gold", "Chrome"]);
  assert.equal(getLinkDesignPresets().length, 64);
  assert.deepEqual(
    [...new Set(LINK_DESIGN_PRESETS.map((entry) => entry.category))],
    LINK_DESIGN_PRESET_CATEGORIES,
  );
});

test("editor derives all nine non-empty categories while onboarding receives the flat catalog", () => {
  assert.deepEqual(getAvailableLinkDesignPresetCategories(), LINK_DESIGN_PRESET_CATEGORIES);
  assert.deepEqual(getAvailableLinkDesignPresetCategories([{ category: "animal" }, { category: "city" }]), ["animal", "city"]);
  assert.deepEqual(getLinkDesignPresets().map((entry) => entry.id), LINK_DESIGN_PRESETS.map((entry) => entry.id));
  assert.equal(getLinkDesignPresets().length, 64);
});

test("image-backed presets use the exact unique allowlisted asset paths", () => {
  const expectedPaths = [
    ...["python-noir", "zebra-mono", "zebra-midnight", "zebra-pink", "leopard-classic", "leopard-mono", "leopard-pink", "leopard-ice"].map((name) => `/trendre-link/backgrounds/animal-${name}.jpg`),
    ...["midnight-ornament", "brick", "vintage-wood", "navy-plaid", "white-marble", "liquid-gold", "paisley-noir", "paisley-blue", "aqua-silk", "silver-marble", "retro-daisy", "bandana-black"].map((name) => `/trendre-link/backgrounds/pattern-${name}.jpg`),
    ...["blue-hour", "dreamy-coast", "burning-sunset"].map((name) => `/trendre-link/backgrounds/emotion-${name}.jpg`),
    ...["cloudy-wish", "bubble-love"].map((name) => `/trendre-link/backgrounds/pretty-${name}.jpg`),
    ...["pastel-shore", "deep-blue-wave", "aqua-water", "forest-light", "bamboo-breeze", "snow-glow", "sunset-shore"].map((name) => `/trendre-link/backgrounds/nature-${name}.jpg`),
    ...["neon-palms", "sunset-downtown", "neon-crossing", "autumn-avenue", "sunset-boulevard", "retro-block", "coastal-town", "cafe-lane", "tokyo-sakura", "tokyo-neon"].map((name) => `/trendre-link/backgrounds/city-${name}.jpg`),
  ];
  const actualPaths = LINK_DESIGN_PRESETS
    .map((entry) => findLinkDesignBackgroundById(entry.backgroundId)?.backgroundImage)
    .filter((path): path is string => Boolean(path));

  assert.equal(actualPaths.length, 42);
  assert.equal(new Set(actualPaths).size, actualPaths.length);
  assert.deepEqual(actualPaths, expectedPaths);
  for (const assetPath of actualPaths) {
    assert.equal(existsSync(path.join(process.cwd(), "public", ...assetPath.split("/").filter(Boolean))), true, assetPath);
  }
});

test("original Pretty patterns do not depend on image assets", () => {
  for (const id of ["tiny-hearts", "baby-argyle", "mint-gingham", "blush-hearts"]) {
    const prettyPreset = LINK_DESIGN_PRESETS.find((entry) => entry.id === id);
    assert.ok(prettyPreset);
    const background = findLinkDesignBackgroundById(prettyPreset.backgroundId);
    assert.ok(background);
    assert.equal(background.backgroundImage, undefined);
    assert.match(background.background, /gradient|data:image\/svg\+xml/);
  }
});

test("explicitly excluded designs and source filenames are absent", () => {
  const names = new Set(LINK_DESIGN_PRESETS.map((entry) => entry.name));
  assert.equal(names.has("Milky Way"), false);
  assert.equal(names.has("Crystal Wave"), false);
  assert.equal(getLinkDesignPresets("pattern").some((entry) => /python|burberry|バーバリー/i.test(entry.name)), false);

  const serializedBackgrounds = JSON.stringify(CREATOR_LINK_BACKGROUND_PRESETS);
  for (const excluded of ["9288742977090353", "15621929951327595", "#волна", "バーバリー"]) {
    assert.equal(serializedBackgrounds.includes(excluded), false);
  }
});

test("applying a preset updates page and item appearances", () => {
  const applied = applyLinkDesignPreset(preset, {
    page: { ...preset.page, accentColor: "#000000", coverUrl: "https://example.com/custom.jpg" },
    socials: [{ metadata: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE }],
    links: [{ metadata: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, shape: "pill", style: "glass" } }],
  });
  assert.deepEqual(applied.page, { ...preset.page, coverUrl: null });
  assert.equal(applied.socials[0].metadata.iconColor, preset.socialIconColor);
  assert.equal(applied.socials[0].metadata.socialStyle, preset.socialStyle);
  assert.equal(applied.socials[0].metadata.socialShape, preset.socialShape);
  assert.equal(applied.socials[0].metadata.surfaceColor, preset.socialSurfaceColor);
  assert.equal(applied.socials[0].metadata.borderColor, preset.socialBorderColor);
  assert.equal(applied.page.coverUrl, null);
  assert.deepEqual(applied.links[0].metadata, preset.linkAppearance);
});

test("all 64 presets coordinate complete link and social appearances", () => {
  for (const entry of LINK_DESIGN_PRESETS) {
    assert.ok(entry.linkAppearance.shape, entry.id);
    assert.ok(entry.linkAppearance.style, entry.id);
    assert.ok(entry.socialStyle, entry.id);
    assert.ok(["icons", "circle", "pill"].includes(entry.socialShape), entry.id);
    if (entry.socialShape === "icons") {
      assert.equal(entry.socialSurfaceColor, null, entry.id);
      assert.equal(entry.socialBorderColor, null, entry.id);
    } else {
      assert.match(entry.socialSurfaceColor ?? "", /^#[0-9A-F]{6}$/, entry.id);
      assert.match(entry.socialBorderColor ?? "", /^#[0-9A-F]{6}$/, entry.id);
    }
  }
  assert.ok(new Set(LINK_DESIGN_PRESETS.map((entry) => entry.socialStyle)).size >= 3);
  assert.ok(new Set(LINK_DESIGN_PRESETS.map((entry) => `${entry.linkAppearance.shape}:${entry.linkAppearance.style}`)).size >= 5);
});

test("matchesPreset requires page, social, and link appearance equality", () => {
  assert.equal(matchesLinkDesignPreset(preset, base), true);
  assert.equal(findMatchingLinkDesignPreset(base)?.id, preset.id);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, page: { ...base.page, coverUrl: "https://example.com/custom.jpg" } }), false);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, socials: [{ metadata: { ...base.socials[0].metadata, iconColor: "#123456" } }] }), false);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, socials: [{ metadata: { ...base.socials[0].metadata, socialSurface: "solid", surfaceColor: "#FFFFFF" } }] }), false);
  assert.equal(findMatchingLinkDesignPreset({ ...base, socials: [{ metadata: { ...base.socials[0].metadata, iconColor: "#123456" } }] }), null);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, links: [{ metadata: { ...base.links[0].metadata, depth: "raised" } }] }), false);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, links: [{ metadata: { ...base.links[0].metadata, shape: "pill" } }] }), false);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, links: [{ metadata: { ...base.links[0].metadata, style: "glass" } }] }), false);
});

test("editor background matching is independent from full appearance matching", () => {
  const backgroundReference = `trendre-background:${preset.backgroundId}`;
  const customized = {
    ...base.page,
    coverUrl: backgroundReference,
    displayNameColor: "#123456",
    fontStyle: "bold" as const,
  };
  assert.equal(findMatchingLinkDesignPreset({ ...base, page: customized }), null);
  assert.equal(findMatchingLinkDesignBackgroundPreset(customized)?.id, preset.id);
  assert.equal(findMatchingLinkDesignBackgroundPreset({ ...customized, coverUrl: "https://example.com/custom.jpg" }), null);
});

test("legacy or unknown accents preserve the existing no-background fallback", () => {
  assert.equal(findLinkDesignBackgroundPreset({ themeKey: "soft-ivory", accentColor: "#123456" }), null);
});
