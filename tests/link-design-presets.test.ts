import assert from "node:assert/strict";
import test from "node:test";

import {
  LINK_DESIGN_PRESETS,
  applyLinkDesignPreset,
  findLinkDesignBackgroundById,
  findMatchingLinkDesignPreset,
  findLinkDesignBackgroundPreset,
  matchesLinkDesignPreset,
} from "../lib/trendre-link/link-design-presets.ts";
import { CREATOR_LINK_BACKGROUND_PRESETS } from "../lib/trendre-link/background-presets.ts";
import { DEFAULT_CREATOR_LINK_ITEM_APPEARANCE } from "../lib/trendre-link/item-validation.ts";

const preset = LINK_DESIGN_PRESETS[0];
const base = {
  page: { ...preset.page },
  socials: [{ metadata: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, iconColor: preset.socialIconColor } }],
  links: [{ metadata: { ...preset.linkAppearance } }],
};

test("design and background preset IDs are unique", () => {
  assert.equal(new Set(LINK_DESIGN_PRESETS.map((entry) => entry.id)).size, LINK_DESIGN_PRESETS.length);
  assert.equal(new Set(CREATOR_LINK_BACKGROUND_PRESETS.map((entry) => entry.id)).size, CREATOR_LINK_BACKGROUND_PRESETS.length);
  for (const entry of LINK_DESIGN_PRESETS) assert.ok(findLinkDesignBackgroundById(entry.backgroundId));
});

test("applying a preset updates page and item appearances", () => {
  const applied = applyLinkDesignPreset(preset, {
    page: { ...preset.page, accentColor: "#000000" },
    socials: [{ metadata: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE }],
    links: [{ metadata: DEFAULT_CREATOR_LINK_ITEM_APPEARANCE }],
  });
  assert.deepEqual(applied.page, preset.page);
  assert.equal(applied.socials[0].metadata.iconColor, preset.socialIconColor);
  assert.deepEqual(applied.links[0].metadata, preset.linkAppearance);
});

test("matchesPreset requires page, social, and link appearance equality", () => {
  assert.equal(matchesLinkDesignPreset(preset, base), true);
  assert.equal(findMatchingLinkDesignPreset(base)?.id, preset.id);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, page: { ...base.page, coverUrl: "https://example.com/custom.jpg" } }), false);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, socials: [{ metadata: { ...base.socials[0].metadata, iconColor: "#123456" } }] }), false);
  assert.equal(findMatchingLinkDesignPreset({ ...base, socials: [{ metadata: { ...base.socials[0].metadata, iconColor: "#123456" } }] }), null);
  assert.equal(matchesLinkDesignPreset(preset, { ...base, links: [{ metadata: { ...base.links[0].metadata, depth: "raised" } }] }), false);
});

test("legacy or unknown accents preserve the existing no-background fallback", () => {
  assert.equal(findLinkDesignBackgroundPreset({ themeKey: "soft-ivory", accentColor: "#123456" }), null);
});
