import assert from "node:assert/strict";
import test from "node:test";

import { repairQuoteOrderState } from "../lib/trendre-link/quote-order-repair.ts";
import { trendreLinkOrderOrigin } from "../lib/trendre-link/quote-order-origin.ts";
import { insertOrRecoverUnique } from "../lib/db/unique-insert.ts";

test("Link注文はcreator_menu_idをNULLにしてinquiryとquoteを保持する", () => {
  assert.deepEqual(trendreLinkOrderOrigin("inquiry-a", "quote-a"), {
    creator_menu_id: null,
    trendre_link_inquiry_id: "inquiry-a",
    trendre_link_quote_id: "quote-a",
  });
});

test("Webhook再送で部分成功したquote・inquiry・event・通知を補完する", async () => {
  const state = {
    quote: false,
    inquiry: false,
    event: new Set<string>(),
    notifications: new Map<string, { id: string }>(),
    failInquiryOnce: true,
    failCreatorNotificationOnce: true,
  };
  const steps = {
    repairOrder: async () => {},
    updateQuote: async () => { state.quote = true; },
    updateInquiry: async () => {
      if (state.failInquiryOnce) {
        state.failInquiryOnce = false;
        throw new Error("inquiry update failed");
      }
      state.inquiry = true;
    },
    upsertEvent: async () => { state.event.add("quote-event"); },
    ensureNotifications: async () => {
      for (const recipient of ["company", "creator"]) {
        await insertOrRecoverUnique({
          insert: async () => {
            if (recipient === "creator" && state.failCreatorNotificationOnce) {
              state.failCreatorNotificationOnce = false;
              return { data: null, error: { code: "50000", message: "creator notification failed" } };
            }
            const existing = state.notifications.get(recipient);
            if (existing) return { data: null, error: { code: "23505" } };
            const created = { id: recipient };
            state.notifications.set(recipient, created);
            return { data: created, error: null };
          },
          recover: async () => ({ data: state.notifications.get(recipient) ?? null, error: null }),
          missingError: "notification missing",
        });
      }
    },
  };

  await assert.rejects(repairQuoteOrderState(steps), /inquiry/);
  await assert.rejects(
    repairQuoteOrderState(steps),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "50000"
  );
  await repairQuoteOrderState(steps);
  await repairQuoteOrderState(steps);

  assert.equal(state.quote, true);
  assert.equal(state.inquiry, true);
  assert.deepEqual([...state.event], ["quote-event"]);
  assert.deepEqual([...state.notifications.keys()].sort(), ["company", "creator"]);
});

for (const failingStep of ["repairOrder", "updateQuote", "updateInquiry", "upsertEvent"] as const) {
  test(`${failingStep}失敗を成功扱いにせずWebhook再送対象へする`, async () => {
    const calls: string[] = [];
    const step = (name: string) => async () => {
      calls.push(name);
      if (name === failingStep) throw new Error(`${name} failed`);
    };
    await assert.rejects(
      repairQuoteOrderState({
        repairOrder: step("repairOrder"),
        updateQuote: step("updateQuote"),
        updateInquiry: step("updateInquiry"),
        upsertEvent: step("upsertEvent"),
        ensureNotifications: step("ensureNotifications"),
      }),
      new RegExp(failingStep)
    );
    assert.equal(calls.includes("ensureNotifications"), false);
  });
}
