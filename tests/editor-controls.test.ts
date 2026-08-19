import assert from "node:assert/strict";
import test from "node:test";

import { getCreatorLinkBackgroundPreviewDefinition, findCreatorLinkBackgroundPreset } from "../lib/trendre-link/background-presets.ts";
import { createCreatorLinkBackgroundReference, isCreatorLinkBackgroundReference, parseCreatorLinkBackgroundReference, withCreatorLinkBackground } from "../lib/trendre-link/background-selection.ts";
import { CREATOR_LINK_ADD_ACTIONS, getCreatorLinkEditorCtaCopy, getCreatorLinkItemCtaCopy, getCreatorLinkSocialColorControls, resolveCreatorLinkPreviewEditTarget } from "../lib/trendre-link/editor-controls.ts";
import { getCreatorLinkWorkRoute, setCreatorLinkWorkEnabled } from "../lib/trendre-link/work-settings.ts";
import { reorderCreatorLinkSocialItems } from "../lib/trendre-link/social-order.ts";
import {
  CREATOR_LINK_ITEM_SHAPES,
  CREATOR_LINK_ITEM_STYLES,
  CREATOR_LINK_SOCIAL_STYLES,
  CREATOR_LINK_SOCIAL_SURFACES,
  CREATOR_LINK_SOCIAL_SHAPES,
  applyCreatorLinkItemStyle,
  normalizeCreatorLinkItemAppearance,
  getCreatorLinkSocialRenderStyle,
  resolveCreatorLinkItemShape,
  resolveCreatorLinkItemStyle,
  resolveCreatorLinkSocialAppearance,
  validateCreatorLinkItemAppearance,
  type CreatorLinkItemAppearance,
} from "../lib/trendre-link/item-validation.ts";

const legacy: CreatorLinkItemAppearance = {
  layout: "wide",
  surface: "outline",
  finish: "solid",
  color: "charcoal",
  depth: "soft",
};

test("legacy item metadata remains shape/style-free and keeps existing fallbacks", () => {
  const normalized = normalizeCreatorLinkItemAppearance(legacy);
  assert.deepEqual(normalized, legacy);
  assert.equal(resolveCreatorLinkItemShape(normalized, "pill"), "pill");
  assert.equal(resolveCreatorLinkItemStyle(normalized, "rounded"), "outline");
  assert.equal(resolveCreatorLinkItemStyle({ ...legacy, surface: "filled" }, "rounded"), "soft");
  assert.equal(resolveCreatorLinkItemStyle({ ...legacy, surface: "filled", depth: "raised" }, "rounded"), "shadow");
  assert.equal(resolveCreatorLinkItemStyle({ ...legacy, surface: "filled", depth: "normal" }, "glass"), "glass");
});

test("all item shapes and styles validate and item overrides win over page buttonStyle", () => {
  for (const shape of CREATOR_LINK_ITEM_SHAPES) {
    const result = validateCreatorLinkItemAppearance({ ...legacy, shape });
    assert.equal(result.ok, true, shape);
    if (result.ok) assert.equal(resolveCreatorLinkItemShape(result.value, "pill"), shape);
  }
  for (const style of CREATOR_LINK_ITEM_STYLES) {
    const result = validateCreatorLinkItemAppearance(applyCreatorLinkItemStyle(legacy, style));
    assert.equal(result.ok, true, style);
    if (result.ok) assert.equal(resolveCreatorLinkItemStyle(result.value, "glass"), style);
  }
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, shape: "circle" }).ok, false);
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, style: "neon" }).ok, false);
});

test("style controls retain legacy fields while mapping their compatibility values", () => {
  assert.deepEqual(applyCreatorLinkItemStyle(legacy, "solid"), { ...legacy, style: "solid", surface: "filled", depth: "normal" });
  assert.deepEqual(applyCreatorLinkItemStyle(legacy, "outline"), { ...legacy, style: "outline", surface: "outline", depth: "normal" });
  assert.deepEqual(applyCreatorLinkItemStyle(legacy, "glass"), { ...legacy, style: "glass", surface: "filled", depth: "normal" });
  assert.deepEqual(applyCreatorLinkItemStyle(legacy, "soft"), { ...legacy, style: "soft", surface: "filled", depth: "soft" });
  assert.deepEqual(applyCreatorLinkItemStyle(legacy, "shadow"), { ...legacy, style: "shadow", surface: "filled", depth: "raised" });
});

test("social icon color accepts brand fallback and persists normalized custom hex", () => {
  const brand = validateCreatorLinkItemAppearance({ ...legacy, iconColor: null });
  assert.equal(brand.ok, true);
  if (brand.ok) assert.equal(brand.value.iconColor, null);

  const custom = validateCreatorLinkItemAppearance({ ...legacy, iconColor: "#ed5964" });
  assert.equal(custom.ok, true);
  if (custom.ok) assert.equal(custom.value.iconColor, "#ED5964");
});

test("social style is optional for legacy items and validates all supported styles", () => {
  assert.equal(normalizeCreatorLinkItemAppearance(legacy).socialStyle, undefined);
  for (const socialStyle of CREATOR_LINK_SOCIAL_STYLES) {
    const result = validateCreatorLinkItemAppearance({ ...legacy, socialStyle });
    assert.equal(result.ok, true, socialStyle);
    if (result.ok) assert.equal(result.value.socialStyle, socialStyle);
  }
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, socialStyle: "badge" }).ok, false);
});

test("Add menu exposes only working Link and Social flows", () => {
  assert.deepEqual(CREATOR_LINK_ADD_ACTIONS, [
    { id: "link", label: "Link", sheet: "link" },
    { id: "social", label: "Social", sheet: "social" },
  ]);
});

test("Editor CTA copy distinguishes create, edit, and page-level save in both locales", () => {
  assert.equal(getCreatorLinkItemCtaCopy("ja", true), "保存");
  assert.equal(getCreatorLinkItemCtaCopy("en", true), "Save");
  assert.equal(getCreatorLinkItemCtaCopy("ja", false), "追加");
  assert.equal(getCreatorLinkItemCtaCopy("en", false), "Add");
  assert.equal(getCreatorLinkEditorCtaCopy("ja", "save"), "保存");
  assert.equal(getCreatorLinkEditorCtaCopy("en", "save"), "Save");
  assert.equal(getCreatorLinkEditorCtaCopy("ja", "saveChanges"), "変更を保存");
  assert.equal(getCreatorLinkEditorCtaCopy("en", "saveChanges"), "Save changes");
});

test("preview targets resolve directly to their canonical editors", () => {
  assert.deepEqual(resolveCreatorLinkPreviewEditTarget({ kind: "profile" }), { sheet: "profile" });
  assert.deepEqual(resolveCreatorLinkPreviewEditTarget({ kind: "social", itemId: "social-1", platform: "instagram" }), { sheet: "social", itemId: "social-1", platform: "instagram" });
  assert.deepEqual(resolveCreatorLinkPreviewEditTarget({ kind: "link", itemId: "link-1" }), { sheet: "link", itemId: "link-1" });
  assert.deepEqual(resolveCreatorLinkPreviewEditTarget({ kind: "work" }), { sheet: "inquiry" });
});

test("social surfaces and custom surface colors validate without changing legacy fallback", () => {
  assert.equal(normalizeCreatorLinkItemAppearance(legacy).socialSurface, undefined);
  assert.equal(normalizeCreatorLinkItemAppearance(legacy).surfaceColor, undefined);
  for (const socialSurface of CREATOR_LINK_SOCIAL_SURFACES) {
    const result = validateCreatorLinkItemAppearance({ ...legacy, socialSurface, surfaceColor: "#fefefe" });
    assert.equal(result.ok, true, socialSurface);
    if (result.ok) {
      assert.equal(result.value.socialSurface, socialSurface);
      assert.equal(result.value.surfaceColor, "#FEFEFE");
    }
  }
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, socialSurface: "soft" }).ok, false);
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, surfaceColor: "red" }).ok, false);
});

test("final Social shapes validate and expose only relevant color controls", () => {
  assert.deepEqual(CREATOR_LINK_SOCIAL_SHAPES, ["icons", "circle", "pill"]);
  assert.deepEqual(getCreatorLinkSocialColorControls("icons"), ["icon"]);
  assert.deepEqual(getCreatorLinkSocialColorControls("circle"), ["icon", "surface", "border"]);
  assert.deepEqual(getCreatorLinkSocialColorControls("pill"), ["icon", "surface", "border"]);
  for (const socialShape of CREATOR_LINK_SOCIAL_SHAPES) {
    assert.equal(validateCreatorLinkItemAppearance({ ...legacy, socialShape }).ok, true, socialShape);
  }
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, socialShape: "glass" }).ok, false);
});

test("new Social colors accept transparent null and normalize hex values", () => {
  const result = validateCreatorLinkItemAppearance({ ...legacy, socialShape: "pill", surfaceColor: null, borderColor: "#abcdef" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.surfaceColor, null);
    assert.equal(result.value.borderColor, "#ABCDEF");
  }
  assert.equal(validateCreatorLinkItemAppearance({ ...legacy, borderColor: "transparent" }).ok, false);
});

test("Icons rendering ignores stale surface and border metadata while Circle and Pill resolve explicit colors", () => {
  assert.deepEqual(resolveCreatorLinkSocialAppearance({ ...legacy, socialShape: "icons", iconColor: "#123456", surfaceColor: "#FFFFFF", borderColor: "#000000" }), {
    shape: "icons", iconColor: "#123456", surfaceColor: null, borderColor: null,
  });
  assert.deepEqual(resolveCreatorLinkSocialAppearance({ ...legacy, socialShape: "circle", iconColor: null, surfaceColor: null, borderColor: "#ABCDEF" }), {
    shape: "circle", iconColor: null, surfaceColor: null, borderColor: "#ABCDEF",
  });
  assert.equal(resolveCreatorLinkSocialAppearance(legacy), null);
});

test("new Social render styles keep icon, background, and border colors independent", () => {
  const first = getCreatorLinkSocialRenderStyle({ shape: "pill", iconColor: "#111111", surfaceColor: "#ED5964", borderColor: "#ED5964" });
  assert.deepEqual(first, { color: "#111111", backgroundColor: "#ED5964", borderColor: "#ED5964", borderStyle: "solid", borderWidth: "1px" });

  const iconChanged = getCreatorLinkSocialRenderStyle({ shape: "pill", iconColor: "#FFFFFF", surfaceColor: "#ED5964", borderColor: "#ED5964" });
  assert.equal(iconChanged.color, "#FFFFFF");
  assert.equal(iconChanged.backgroundColor, first.backgroundColor);
  assert.equal(iconChanged.borderColor, first.borderColor);

  const borderChanged = getCreatorLinkSocialRenderStyle({ shape: "pill", iconColor: "#FFFFFF", surfaceColor: "#ED5964", borderColor: "#000000" });
  assert.equal(borderChanged.color, iconChanged.color);
  assert.equal(borderChanged.backgroundColor, iconChanged.backgroundColor);
  assert.equal(borderChanged.borderColor, "#000000");

  const transparent = getCreatorLinkSocialRenderStyle({ shape: "circle", iconColor: "#111111", surfaceColor: null, borderColor: null });
  assert.deepEqual(transparent, { color: "#111111", backgroundColor: "transparent", borderColor: "transparent", borderStyle: "solid", borderWidth: "0px" });
  assert.deepEqual(getCreatorLinkSocialRenderStyle({ shape: "icons", iconColor: "#FFFFFF", surfaceColor: "#111111", borderColor: "#FF4F81" }), { color: "#FFFFFF" });
});

test("background references are allowlisted and background-only updates preserve all other appearance", () => {
  const reference = createCreatorLinkBackgroundReference("animal-python-noir");
  assert.equal(isCreatorLinkBackgroundReference(reference), true);
  assert.equal(parseCreatorLinkBackgroundReference(reference)?.id, "animal-python-noir");
  assert.equal(isCreatorLinkBackgroundReference("trendre-background:missing"), false);
  const page = { coverUrl: null, fontStyle: "serif", displayNameColor: "#FFFFFF", social: { color: "#EEEEEE" }, links: { shape: "pill" }, work: { enabled: true } };
  const changed = withCreatorLinkBackground(page, reference);
  assert.equal(changed.coverUrl, reference);
  assert.deepEqual({ ...changed, coverUrl: null }, page);
  assert.deepEqual(withCreatorLinkBackground(changed, null), page);
});

test("Work routing covers both, PR-only, Other-only, and both-off states", () => {
  assert.equal(getCreatorLinkWorkRoute({ pr: { isEnabled: true }, simple: { isEnabled: true } }), "choice");
  assert.equal(getCreatorLinkWorkRoute({ pr: { isEnabled: true }, simple: { isEnabled: false } }), "pr");
  assert.equal(getCreatorLinkWorkRoute({ pr: { isEnabled: false }, simple: { isEnabled: true } }), "simple");
  assert.equal(getCreatorLinkWorkRoute({ pr: { isEnabled: false }, simple: { isEnabled: false } }), "hidden");
  const titled = { pr: { isEnabled: false, title: "PR" }, simple: { isEnabled: false, title: "Other" } };
  assert.deepEqual(setCreatorLinkWorkEnabled(titled, true), { pr: { isEnabled: false, title: "PR" }, simple: { isEnabled: true, title: "Other" } });
});

test("image wallpaper previews reuse the public background definition", () => {
  const imagePreset = findCreatorLinkBackgroundPreset({ themeKey: "minimal-black", accentColor: "#17151A" });
  assert.ok(imagePreset);
  const imagePreview = getCreatorLinkBackgroundPreviewDefinition(imagePreset);
  assert.equal(imagePreview.imageUrl, "/trendre-link/backgrounds/animal-python-noir.jpg");
  assert.equal(imagePreview.imagePosition, imagePreset.backgroundPosition ?? "center");
  assert.equal(imagePreview.overlay, imagePreset.backgroundOverlay);

  const cssPreset = findCreatorLinkBackgroundPreset({ themeKey: "soft-ivory", accentColor: "#F4F5F7" });
  assert.ok(cssPreset);
  const cssPreview = getCreatorLinkBackgroundPreviewDefinition(cssPreset);
  assert.equal(cssPreview.imageUrl, null);
  assert.equal(cssPreview.background, cssPreset.background);
});

test("Preview Social reorder moves only the dragged social item", () => {
  const socials = [
    { id: "instagram", itemType: "social", metadata: { socialShape: "icons" } },
    { id: "tiktok", itemType: "social", metadata: { socialShape: "circle" } },
    { id: "youtube", itemType: "social", metadata: { socialShape: "pill" } },
  ];

  const reordered = reorderCreatorLinkSocialItems(socials, "youtube", "instagram");
  assert.deepEqual(reordered.map((item) => item.id), ["youtube", "instagram", "tiktok"]);
  assert.deepEqual(reordered.map((item) => item.metadata.socialShape), ["pill", "icons", "circle"]);
});

test("Preview Social reorder is stable for same or unknown drag targets", () => {
  const socials = [
    { id: "instagram", itemType: "social" },
    { id: "tiktok", itemType: "social" },
  ];

  assert.deepEqual(reorderCreatorLinkSocialItems(socials, "instagram", "instagram"), socials);
  assert.deepEqual(reorderCreatorLinkSocialItems(socials, "missing", "tiktok"), socials);
  assert.deepEqual(reorderCreatorLinkSocialItems(socials, "instagram", "missing"), socials);
});
