import assert from "node:assert/strict";
import test from "node:test";

import {
  isOrderCaptureInProgress,
  isOrderCreator,
  orderCaptureIdempotencyKey,
  retrieveOrCaptureOrderPaymentIntent,
  shouldRepairAcceptedOrder,
} from "../lib/orders/order-acceptance.ts";

const orderId = "11111111-1111-4111-8111-111111111111";
const paymentIntentId = "pi_test_order";

test("注文受諾はCreator本人だけに許可する", () => {
  const order = { creator_user_id: "creator-user" };
  assert.equal(isOrderCreator(order, "creator-user"), true);
  assert.equal(isOrderCreator(order, "company-user"), false);
  assert.equal(isOrderCreator(order, "third-party"), false);
});

test("capture idempotency keyは注文IDとPaymentIntent IDから安定して生成する", () => {
  const first = orderCaptureIdempotencyKey(orderId, paymentIntentId);
  const retried = orderCaptureIdempotencyKey(orderId, paymentIntentId);

  assert.equal(first, retried);
  assert.equal(first, `creator-order-capture/${orderId}/${paymentIntentId}`);
});

test("requires_captureだけを固定idempotency keyでcaptureする", async () => {
  const captureCalls: Array<{ id: string; key: string }> = [];
  const result = await retrieveOrCaptureOrderPaymentIntent({
    orderId,
    paymentIntentId,
    gateway: {
      retrieve: async () => ({ status: "requires_capture" }),
      capture: async (id, key) => {
        captureCalls.push({ id, key });
        return { status: "succeeded" };
      },
    },
  });

  assert.equal(result.status, "succeeded");
  assert.deepEqual(captureCalls, [
    {
      id: paymentIntentId,
      key: orderCaptureIdempotencyKey(orderId, paymentIntentId),
    },
  ]);
});

test("同じ注文の並行capture要求は同じidempotency keyを渡す", async () => {
  const keys: string[] = [];
  const execute = () =>
    retrieveOrCaptureOrderPaymentIntent({
      orderId,
      paymentIntentId,
      gateway: {
        retrieve: async () => ({ status: "requires_capture" }),
        capture: async (_id, key) => {
          keys.push(key);
          return { status: "succeeded" };
        },
      },
    });

  await Promise.all([execute(), execute()]);
  assert.equal(keys.length, 2);
  assert.equal(new Set(keys).size, 1);
});

test("succeededまたは予期しない状態ではcaptureを再実行しない", async () => {
  for (const status of ["succeeded", "processing", "requires_payment_method"]) {
    let captureCalls = 0;
    const result = await retrieveOrCaptureOrderPaymentIntent({
      orderId,
      paymentIntentId,
      gateway: {
        retrieve: async () => ({ status }),
        capture: async () => {
          captureCalls += 1;
          return { status: "succeeded" };
        },
      },
    });
    assert.equal(result.status, status);
    assert.equal(captureCalls, 0, status);
  }
});

test("processingは失敗確定ではなく再試行可能な処理中状態として扱う", () => {
  assert.equal(isOrderCaptureInProgress("processing"), true);
  assert.equal(isOrderCaptureInProgress("succeeded"), false);
  assert.equal(isOrderCaptureInProgress("requires_payment_method"), false);
});

test("accepted_capturedかつcapturedの再送はStripeを呼ばず修復対象にする", () => {
  assert.equal(
    shouldRepairAcceptedOrder({
      status: "accepted_captured",
      payment_status: "captured",
    }),
    true
  );
  assert.equal(
    shouldRepairAcceptedOrder({
      status: "authorized_pending_creator",
      payment_status: "authorized",
    }),
    false
  );
});
