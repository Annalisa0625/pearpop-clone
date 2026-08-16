import assert from "node:assert/strict";
import test from "node:test";

import { getManualCaptureOrderPlan } from "../lib/trendre-link/manual-capture-order.ts";

test("新規注文はrequires_captureだけを許可する", () => {
  assert.deepEqual(
    getManualCaptureOrderPlan({ paymentIntentStatus: "requires_capture", existingOrder: null }),
    {
      ok: true,
      orderStatus: "authorized_pending_creator",
      paymentStatus: "authorized",
      repairExistingOrder: false,
    }
  );
  assert.deepEqual(
    getManualCaptureOrderPlan({ paymentIntentStatus: "succeeded", existingOrder: null }),
    { ok: false, reason: "intent_status" }
  );
});

test("既存manual capture注文のrequires_captureと正規capture済みsucceededを修復する", () => {
  const authorized = { status: "authorized_pending_creator", paymentStatus: "authorized" };
  assert.equal(
    getManualCaptureOrderPlan({ paymentIntentStatus: "requires_capture", existingOrder: authorized }).ok,
    true
  );
  assert.deepEqual(
    getManualCaptureOrderPlan({ paymentIntentStatus: "succeeded", existingOrder: authorized }),
    {
      ok: true,
      orderStatus: "accepted_captured",
      paymentStatus: "captured",
      repairExistingOrder: true,
    }
  );
  assert.equal(
    getManualCaptureOrderPlan({
      paymentIntentStatus: "succeeded",
      existingOrder: { status: "accepted_captured", paymentStatus: "captured" },
    }).ok,
    true
  );
});

test("automatic相当・不正状態では注文更新計画を返さない", () => {
  assert.equal(
    getManualCaptureOrderPlan({ paymentIntentStatus: "processing", existingOrder: null }).ok,
    false
  );
  assert.equal(
    getManualCaptureOrderPlan({
      paymentIntentStatus: "requires_capture",
      existingOrder: { status: "accepted_captured", paymentStatus: "captured" },
    }).ok,
    false
  );
});
