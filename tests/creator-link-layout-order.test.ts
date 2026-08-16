import assert from "node:assert/strict";
import test from "node:test";

import { areCreatorLinkLayoutOrdersEqual, createCreatorLinkLegacyLayoutOrder, normalizeCreatorLinkLayoutOrder, parseCreatorLinkLayoutOrder, parseCreatorLinkLayoutToken, reorderVisibleCreatorLinkLayoutOrder } from "../lib/trendre-link/layout-order.ts";
import { reorderCreatorLinkSocialItems } from "../lib/trendre-link/social-order.ts";

const LINK_A = "11111111-1111-4111-8111-111111111111";
const LINK_B = "22222222-2222-4222-8222-222222222222";
const DELETED_LINK = "33333333-3333-4333-8333-333333333333";

test("layout token parser accepts only Social, Work, and UUID-backed Link tokens", () => {
  assert.equal(parseCreatorLinkLayoutToken("social"), "social");
  assert.equal(parseCreatorLinkLayoutToken("work"), "work");
  assert.equal(parseCreatorLinkLayoutToken(`link:${LINK_A}`), `link:${LINK_A}`);
  assert.equal(parseCreatorLinkLayoutToken("link:not-a-uuid"), null);
  assert.equal(parseCreatorLinkLayoutToken("badge:future"), null);
});

test("null or malformed layout order uses the stable legacy Social, Work, Links order", () => {
  const expected = ["social", "work", `link:${LINK_A}`, `link:${LINK_B}`];
  assert.deepEqual(createCreatorLinkLegacyLayoutOrder([LINK_A, LINK_B]), expected);
  assert.deepEqual(normalizeCreatorLinkLayoutOrder(null, [LINK_A, LINK_B]), expected);
  assert.deepEqual(normalizeCreatorLinkLayoutOrder({ order: [] }, [LINK_A, LINK_B]), expected);
});

test("stored order preserves valid tokens and removes duplicates, unknown tokens, and deleted links", () => {
  assert.deepEqual(
    normalizeCreatorLinkLayoutOrder([`link:${LINK_B}`, "work", `link:${LINK_B}`, "badge", `link:${DELETED_LINK}`, "social"], [LINK_A, LINK_B]),
    [`link:${LINK_B}`, "work", "social", `link:${LINK_A}`],
  );
});

test("missing blocks append without disturbing the persisted valid order", () => {
  assert.deepEqual(
    normalizeCreatorLinkLayoutOrder([`link:${LINK_A}`], [LINK_A, LINK_B]),
    [`link:${LINK_A}`, "social", "work", `link:${LINK_B}`],
  );
});

test("all supported cross-type orders remain stable", () => {
  const examples = [
    ["social", "work", `link:${LINK_A}`, `link:${LINK_B}`],
    [`link:${LINK_A}`, "social", `link:${LINK_B}`, "work"],
    ["work", `link:${LINK_A}`, "social", `link:${LINK_B}`],
    [`link:${LINK_A}`, `link:${LINK_B}`, "work", "social"],
  ];
  for (const order of examples) {
    assert.deepEqual(normalizeCreatorLinkLayoutOrder(order, [LINK_A, LINK_B]), order);
  }
});

test("stored parser keeps only canonical unique tokens and preserves null fallback state", () => {
  assert.equal(parseCreatorLinkLayoutOrder(null), null);
  assert.deepEqual(
    parseCreatorLinkLayoutOrder(["social", "unknown", "social", `link:${LINK_A}`, "link:not-a-uuid"]),
    ["social", `link:${LINK_A}`],
  );
});

test("reordering visible blocks retains hidden Work and Social positions", () => {
  const full = ["social", `link:${LINK_A}`, "work", `link:${LINK_B}`] as const;
  assert.deepEqual(
    reorderVisibleCreatorLinkLayoutOrder(full, [`link:${LINK_B}`, `link:${LINK_A}`]),
    ["social", `link:${LINK_B}`, "work", `link:${LINK_A}`],
  );
});

test("layout dirty comparison is ordered and exact", () => {
  const saved = ["social", "work", `link:${LINK_A}`] as const;
  assert.equal(areCreatorLinkLayoutOrdersEqual(saved, [...saved]), true);
  assert.equal(areCreatorLinkLayoutOrdersEqual(saved, ["work", "social", `link:${LINK_A}`]), false);
});

test("invalid and duplicate link ids never create layout tokens", () => {
  assert.deepEqual(createCreatorLinkLegacyLayoutOrder([LINK_A, LINK_A, "not-a-uuid"]), ["social", "work", `link:${LINK_A}`]);
});

test("individual Social reorder never changes or enters the top-level layout order", () => {
  const layoutOrder = [`link:${LINK_A}`, "social", "work"] as const;
  const socials = [
    { id: LINK_A, itemType: "social" },
    { id: LINK_B, itemType: "social" },
  ];

  assert.deepEqual(reorderCreatorLinkSocialItems(socials, LINK_A, LINK_B).map((item) => item.id), [LINK_B, LINK_A]);
  assert.deepEqual(layoutOrder, [`link:${LINK_A}`, "social", "work"]);
  assert.equal(layoutOrder.includes(LINK_A as (typeof layoutOrder)[number]), false);
  assert.equal(layoutOrder.filter((token) => token === "social").length, 1);
});
