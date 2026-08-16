import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShipmentRegistrationPlan,
  executeShipmentRegistration,
  type ShipmentOrder,
  type ShipmentRegistrationDependencies,
  type ShipmentRegistrationPlan,
} from "../lib/orders/order-shipment.ts";

function createOrder(overrides: Partial<ShipmentOrder> = {}): ShipmentOrder {
  return {
    id: "order-1",
    b_user_id: "company-1",
    creator_user_id: "creator-1",
    creator_menu_id: null,
    status: "accepted_captured",
    payment_status: "captured",
    fulfillment_type: "product_shipping",
    preparation_status: "waiting_shipment",
    shipping_address_shared_at: "2026-08-01T00:00:00.000Z",
    shipping_carrier: null,
    shipping_tracking_number: null,
    shipped_at: null,
    received_at: null,
    ...overrides,
  };
}

function createMemoryDependencies() {
  const notifications = new Map<
    string,
    { recipientUserId: string; plan: ShipmentRegistrationPlan }
  >();
  const events = new Set<string>();
  let updates = 0;

  const dependencies: ShipmentRegistrationDependencies = {
    updateOrder: async () => {
      updates += 1;
    },
    recordEvent: async (plan) => {
      events.add(plan.eventDedupeKey);
    },
    notifyCreator: async (plan, recipientUserId) => {
      await Promise.resolve();
      if (!notifications.has(plan.notificationDedupeKey)) {
        notifications.set(plan.notificationDedupeKey, { recipientUserId, plan });
      }
      return { ok: true };
    },
  };

  return { dependencies, notifications, events, get updates() { return updates; } };
}

const shipment = {
  shippingCarrier: "ヤマト運輸",
  shippingTrackingNumber: "123456789012",
  nowIso: "2026-08-06T00:00:00.000Z",
};

async function submit(
  order: ShipmentOrder,
  dependencies: ShipmentRegistrationDependencies,
  overrides: Partial<typeof shipment> = {}
) {
  return executeShipmentRegistration({
    order,
    userId: order.b_user_id,
    ...shipment,
    ...overrides,
    dependencies,
  });
}

test("初回発送登録でCreator通知を1件だけ作成する", async () => {
  const state = createMemoryDependencies();
  await submit(createOrder(), state.dependencies);

  assert.equal(state.notifications.size, 1);
  assert.equal([...state.notifications.values()][0]?.recipientUserId, "creator-1");
});

test("同じ発送内容の再送でも通知とイベントを1件に保つ", async () => {
  const state = createMemoryDependencies();
  const order = createOrder();
  await submit(order, state.dependencies);
  await submit(order, state.dependencies);

  assert.equal(state.notifications.size, 1);
  assert.equal(state.events.size, 1);
});

test("同じ発送内容の並行登録でも通知を1件に保つ", async () => {
  const state = createMemoryDependencies();
  const order = createOrder();
  await Promise.all([
    submit(order, state.dependencies),
    submit(order, state.dependencies),
  ]);

  assert.equal(state.notifications.size, 1);
  assert.equal(state.events.size, 1);
});

test("通常メニュー注文とTrendre Link注文の両方で1件だけ通知する", async () => {
  for (const creatorMenuId of ["menu-1", null]) {
    const state = createMemoryDependencies();
    await submit(createOrder({ creator_menu_id: creatorMenuId }), state.dependencies);
    assert.equal(state.notifications.size, 1);
  }
});

test("別注文にはそれぞれ固有の通知を作成する", async () => {
  const state = createMemoryDependencies();
  await submit(createOrder({ id: "order-1" }), state.dependencies);
  await submit(createOrder({ id: "order-2" }), state.dependencies);

  assert.equal(state.notifications.size, 2);
});

test("対象Company以外からの発送登録を副作用前に拒否する", async () => {
  const state = createMemoryDependencies();
  await assert.rejects(
    executeShipmentRegistration({
      order: createOrder(),
      userId: "company-other",
      ...shipment,
      dependencies: state.dependencies,
    }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("権限がありません")
  );

  assert.equal(state.updates, 0);
  assert.equal(state.notifications.size, 0);
});

test("通知先にはクライアント入力ではなく注文のCreator本人を使う", async () => {
  const state = createMemoryDependencies();
  await submit(
    createOrder({ creator_user_id: "creator-from-order" }),
    state.dependencies
  );

  assert.equal(
    [...state.notifications.values()][0]?.recipientUserId,
    "creator-from-order"
  );
});

test("配送会社または追跡番号の正当な変更は別バージョンとして各1件通知する", () => {
  const order = createOrder({
    shipped_at: "2026-08-05T00:00:00.000Z",
    shipping_carrier: shipment.shippingCarrier,
    shipping_tracking_number: shipment.shippingTrackingNumber,
  });
  const original = buildShipmentRegistrationPlan({ order, ...shipment });
  const carrierChanged = buildShipmentRegistrationPlan({
    order,
    ...shipment,
    shippingCarrier: "佐川急便",
  });
  const trackingChanged = buildShipmentRegistrationPlan({
    order,
    ...shipment,
    shippingTrackingNumber: "999999999999",
  });

  assert.notEqual(original.notificationDedupeKey, carrierChanged.notificationDedupeKey);
  assert.notEqual(original.notificationDedupeKey, trackingChanged.notificationDedupeKey);
  assert.equal(carrierChanged.notificationTitle, "発送情報が更新されました");
});

test("通知DBエラーを発送登録成功として扱わない", async () => {
  const state = createMemoryDependencies();
  await assert.rejects(
    submit(createOrder(), {
      ...state.dependencies,
      notifyCreator: async () => ({ ok: false, error: "database unavailable" }),
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "database unavailable"
  );
});

test("注文更新またはイベントDBエラーも成功扱いにしない", async () => {
  const state = createMemoryDependencies();
  await assert.rejects(
    submit(createOrder(), {
      ...state.dependencies,
      updateOrder: async () => {
        throw new Error("order update failed");
      },
    }),
    /order update failed/
  );
  await assert.rejects(
    submit(createOrder(), {
      ...state.dependencies,
      recordEvent: async () => {
        throw new Error("event insert failed");
      },
    }),
    /event insert failed/
  );
});
