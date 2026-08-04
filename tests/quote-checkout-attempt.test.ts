import assert from "node:assert/strict";
import test from "node:test";

import {
  CHECKOUT_AMBIGUOUS_RECOVERY_MS,
  CHECKOUT_CREATING_LOCK_MS,
  decideCheckoutAttempt,
} from "../lib/trendre-link/quote-checkout-attempt.ts";

const now = Date.UTC(2026, 7, 4);
const base = {
  checkoutStatus: "creating",
  hasSessionId: false,
  attemptCount: 1,
  attemptToken: "token-a",
  checkoutStartedAt: new Date(now - 60_000).toISOString(),
  lockUpdatedAt: new Date(now - CHECKOUT_CREATING_LOCK_MS - 1).toISOString(),
  now,
};

test("短時間の曖昧attemptは同じtokenで回収し、処理中lockは待機させる", () => {
  assert.deepEqual(decideCheckoutAttempt(base), { action: "recover" });
  assert.deepEqual(
    decideCheckoutAttempt({
      ...base,
      lockUpdatedAt: new Date(now - CHECKOUT_CREATING_LOCK_MS + 1).toISOString(),
    }),
    { action: "busy" }
  );
});

test("安全回収期間を超えた曖昧attemptは新Sessionを作らず確認待ちにする", () => {
  assert.deepEqual(
    decideCheckoutAttempt({
      ...base,
      checkoutStartedAt: new Date(now - CHECKOUT_AMBIGUOUS_RECOVERY_MS).toISOString(),
    }),
    { action: "recovery_required", reason: "recovery_window_elapsed" }
  );
  assert.deepEqual(
    decideCheckoutAttempt({ ...base, attemptToken: null }),
    { action: "recovery_required", reason: "missing_identity" }
  );
});

test("明確に失敗済みの状態だけ新attemptへ進める", () => {
  assert.deepEqual(decideCheckoutAttempt({ ...base, checkoutStatus: "failed" }), {
    action: "new",
  });
  assert.deepEqual(decideCheckoutAttempt({ ...base, checkoutStatus: "recovery_required" }), {
    action: "recovery_required",
    reason: "recovery_window_elapsed",
  });
});
