import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATOR_LINK_SERVICE_KEYS,
  CREATOR_LINK_SERVICE_REGISTRY,
  CREATOR_LINK_SOCIAL_SERVICES,
  CREATOR_LINK_STANDARD_SERVICES,
  extractCreatorLinkServiceEditableValue,
  getCreatorLinkServiceKeyFromMetadata,
  normalizeCreatorLinkServiceInput,
  validateCreatorLinkServiceLink,
} from "../lib/trendre-link/service-registry.ts";
import {
  DEFAULT_CREATOR_LINK_ITEM_APPEARANCE,
  normalizeCreatorLinkItemAppearance,
  normalizeSocialProfile,
  validateCreatorLinkItemAppearance,
} from "../lib/trendre-link/item-validation.ts";
import { applyLinkDesignPreset, LINK_DESIGN_PRESETS } from "../lib/trendre-link/link-design-presets.ts";
import { areCreatorLinkEditorDraftsEqual } from "../lib/trendre-link/editor-draft.ts";

test("service registry keys are unique and define the expected service groups", () => {
  assert.equal(new Set(CREATOR_LINK_SERVICE_KEYS).size, CREATOR_LINK_SERVICE_KEYS.length);
  assert.deepEqual(CREATOR_LINK_SOCIAL_SERVICES, ["instagram", "tiktok", "x", "youtube", "threads"]);
  assert.deepEqual(CREATOR_LINK_STANDARD_SERVICES, ["rakuten_room", "wear", "amazon_storefront", "apple_music", "spotify", "note", "lips"]);
  for (const key of CREATOR_LINK_SERVICE_KEYS) {
    const definition = CREATOR_LINK_SERVICE_REGISTRY[key];
    assert.equal(definition.key, key);
    assert.ok(definition.labelEn);
    assert.ok(definition.labelJa);
    assert.ok(definition.inputMode === "handle" || definition.inputMode === "url");
  }
});

const handleCases = [
  ["instagram", "creator.name", "creator.name", "https://www.instagram.com/creator.name/"],
  ["instagram", "@creator.name", "creator.name", "https://www.instagram.com/creator.name/"],
  ["instagram", "https://www.instagram.com/creator.name/", "creator.name", "https://www.instagram.com/creator.name/"],
  ["tiktok", "creator.name", "creator.name", "https://www.tiktok.com/@creator.name"],
  ["tiktok", "@creator.name", "creator.name", "https://www.tiktok.com/@creator.name"],
  ["tiktok", "https://www.tiktok.com/@creator.name?lang=ja", "creator.name", "https://www.tiktok.com/@creator.name"],
  ["x", "https://twitter.com/creator_name/", "creator_name", "https://x.com/creator_name"],
  ["youtube", "@creator-name", "creator-name", "https://www.youtube.com/@creator-name"],
  ["youtube", "https://www.youtube.com/@creator-name/", "creator-name", "https://www.youtube.com/@creator-name"],
  ["threads", "https://www.threads.com/@creator.name/", "creator.name", "https://www.threads.com/@creator.name"],
  ["wear", "rinaty0416", "rinaty0416", "https://wear.jp/rinaty0416/"],
  ["wear", "https://wear.jp/rinaty0416/", "rinaty0416", "https://wear.jp/rinaty0416/"],
] as const;

for (const [key, input, editableValue, url] of handleCases) {
  test(`${key} smart input normalizes ${input}`, () => {
    const result = normalizeCreatorLinkServiceInput(key, input);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.editableValue, editableValue);
    assert.equal(result.value.url, url);
    assert.equal(extractCreatorLinkServiceEditableValue(key, result.value.url), editableValue);
  });
}

test("legacy YouTube channel URLs remain valid without being forced into handle form", () => {
  const input = "https://www.youtube.com/channel/UC123456789";
  const result = normalizeCreatorLinkServiceInput("youtube", input);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.url, input);
});

test("known URL services validate exact hosts and retain paths and queries", () => {
  const accepted = [
    ["rakuten_room", "https://room.rakuten.co.jp/room/example/items?scid=abc"],
    ["apple_music", "https://music.apple.com/jp/album/example/123"],
    ["spotify", "https://open.spotify.com/playlist/abc?si=123"],
    ["note", "https://note.com/creator/n/n123"],
    ["lips", "https://lipscosme.com/users/123"],
    ["amazon_storefront", "https://www.amazon.co.jp/shop/example"],
  ] as const;
  for (const [key, url] of accepted) {
    const result = normalizeCreatorLinkServiceInput(key, url);
    assert.equal(result.ok, true, `${key} should accept its official host`);
    if (result.ok) assert.equal(result.value.url, url);
  }
});

test("known services reject deceptive hosts and unsafe protocols", () => {
  const rejected = [
    ["spotify", "https://spotify.example.com/artist/abc"],
    ["spotify", "https://open.spotify.com.evil.test/artist/abc"],
    ["rakuten_room", "https://room.rakuten.co.jp.evil.test/room/abc"],
    ["amazon_storefront", "https://amazon.example.com/shop/abc"],
    ["custom", "javascript:alert(1)"],
    ["custom", "data:text/html,hello"],
  ] as const;
  for (const [key, url] of rejected) assert.equal(normalizeCreatorLinkServiceInput(key, url).ok, false);
});

test("standard links validate identity while custom links retain the legacy fallback", () => {
  for (const [serviceKey, input] of [
    ["rakuten_room", "https://room.rakuten.co.jp/room/example"],
    ["wear", "rinaty0416"],
    ["apple_music", "https://music.apple.com/jp/artist/example/123"],
    ["spotify", "https://open.spotify.com/artist/abc"],
  ] as const) {
    const result = validateCreatorLinkServiceLink({ serviceKey, title: "Creator", input });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.serviceKey, serviceKey);
  }
  const legacy = validateCreatorLinkServiceLink({ serviceKey: "custom", title: "Portfolio", input: "https://example.com/path" });
  assert.equal(legacy.ok, true);
  assert.equal(getCreatorLinkServiceKeyFromMetadata({ layout: "wide" }), null);
});

test("service metadata and unknown metadata survive normalization, validation, and preset application", () => {
  const metadata = { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, serviceKey: "spotify" as const, futureField: { enabled: true } };
  assert.deepEqual((normalizeCreatorLinkItemAppearance(metadata) as unknown as Record<string, unknown>).futureField, { enabled: true });
  const validated = validateCreatorLinkItemAppearance(metadata);
  assert.equal(validated.ok, true);
  if (validated.ok) assert.deepEqual((validated.value as unknown as Record<string, unknown>).futureField, { enabled: true });
  const applied = applyLinkDesignPreset(LINK_DESIGN_PRESETS[0], {
    page: { ...LINK_DESIGN_PRESETS[0].page },
    socials: [],
    links: [{ metadata }],
  });
  assert.equal(applied.links[0].metadata.serviceKey, "spotify");
  assert.deepEqual((applied.links[0].metadata as unknown as Record<string, unknown>).futureField, { enabled: true });
});

test("standard service additions stay in the unified draft until the saved snapshot advances", () => {
  const persisted = { form: { status: "published" }, items: [], layoutOrder: [], inquiryForms: {} };
  const serviceItem = {
    id: "draft-service",
    sortOrder: 0,
    url: "https://open.spotify.com/artist/abc",
    metadata: { ...DEFAULT_CREATOR_LINK_ITEM_APPEARANCE, serviceKey: "spotify" as const },
  };
  const edited = { ...persisted, items: [serviceItem], layoutOrder: [] };
  assert.equal(areCreatorLinkEditorDraftsEqual(edited, persisted), false);
  assert.deepEqual(persisted.items, []);
  const savedSnapshot = structuredClone(edited);
  assert.equal(areCreatorLinkEditorDraftsEqual(edited, savedSnapshot), true);
  assert.equal(savedSnapshot.items[0].metadata.serviceKey, "spotify");
  assert.equal(savedSnapshot.items[0].url, "https://open.spotify.com/artist/abc");
  assert.deepEqual(persisted.items, []);
});

test("social compatibility uses the registry for canonical output", () => {
  assert.deepEqual(normalizeSocialProfile("threads", "@creator"), {
    ok: true,
    value: { title: "Threads", url: "https://www.threads.com/@creator" },
  });
  assert.equal(normalizeSocialProfile("instagram", "https://instagram.example.com/creator").ok, false);
});
