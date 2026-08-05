import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreateOrderChatForOrder,
  getExistingOrderChat,
  isOrderChatParticipant,
  ensureOrderChat,
  type OrderChatInsert,
  type OrderChatRow,
  type OrderChatSource,
} from "../lib/orders/order-chat.ts";

function createMemoryStore(options: { failInsert?: boolean } = {}) {
  const chats = new Map<string, OrderChatRow>();
  let insertCount = 0;

  return {
    chats,
    get insertCount() {
      return insertCount;
    },
    store: {
      findByOrderId: async (orderId: string) => ({
        data:
          [...chats.values()].find((chat) => chat.order_id === orderId) ?? null,
        error: null,
      }),
      insert: async (input: OrderChatInsert) => {
        await Promise.resolve();
        if (options.failInsert) {
          return { data: null, error: { code: "50000", message: "insert failed" } };
        }
        if (chats.has(input.id)) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        const chat: OrderChatRow = {
          ...input,
          created_at: "2026-08-05T00:00:00.000Z",
        };
        chats.set(chat.id, chat);
        insertCount += 1;
        return { data: chat, error: null };
      },
    },
  };
}

function order(overrides: Partial<OrderChatSource> = {}): OrderChatSource {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    b_user_id: "company-user",
    creator_user_id: "creator-user",
    creator_menu_id: null,
    ...overrides,
  };
}

test("Trendre Link注文はcreator_menu_idがNULLでも受諾後チャットを作成する", async () => {
  const memory = createMemoryStore();
  const result = await ensureOrderChat(memory.store, order());

  assert.equal(result.created, true);
  assert.equal(result.chat.order_id, order().id);
  assert.equal(result.chat.company_user_id, "company-user");
  assert.equal(result.chat.creator_user_id, "creator-user");
});

test("通常のcreator_menus由来注文でもチャットを作成する", async () => {
  const memory = createMemoryStore();
  const result = await ensureOrderChat(
    memory.store,
    order({ creator_menu_id: "menu-id" })
  );

  assert.equal(result.created, true);
  assert.equal(result.chat.order_id, order().id);
});

test("同じ注文を2回処理しても既存チャットを再利用して1件に保つ", async () => {
  const memory = createMemoryStore();
  const first = await ensureOrderChat(memory.store, order());
  const second = await ensureOrderChat(memory.store, order());

  assert.equal(first.chat.id, second.chat.id);
  assert.equal(second.created, false);
  assert.equal(memory.chats.size, 1);
  assert.equal(memory.insertCount, 1);
});

test("同時実行でも注文ID由来の主キー競合を回収してチャットを1件に保つ", async () => {
  const memory = createMemoryStore();
  const [first, second] = await Promise.all([
    ensureOrderChat(memory.store, order()),
    ensureOrderChat(memory.store, order()),
  ]);

  assert.equal(first.chat.id, second.chat.id);
  assert.equal(memory.chats.size, 1);
  assert.equal(memory.insertCount, 1);
});

test("既存チャットがある場合は参加者を検証して再利用する", async () => {
  const memory = createMemoryStore();
  const existing: OrderChatRow = {
    id: "existing-chat",
    request_id: null,
    order_id: order().id,
    company_user_id: "company-user",
    creator_user_id: "creator-user",
    created_at: "2026-08-04T00:00:00.000Z",
    last_message_at: null,
  };
  memory.chats.set(existing.id, existing);

  const result = await ensureOrderChat(memory.store, order());
  assert.equal(result.chat.id, existing.id);
  assert.equal(result.created, false);
  assert.equal(memory.insertCount, 0);
});

test("終了済み注文でも既存チャットの取得を妨げない", async () => {
  const memory = createMemoryStore();
  const existing = (await ensureOrderChat(memory.store, order())).chat;

  assert.equal(
    canCreateOrderChatForOrder({
      status: "completed",
      payment_status: "captured",
      accepted_at: "2026-08-05T00:00:00.000Z",
    }),
    true
  );
  assert.equal((await getExistingOrderChat(memory.store, order()))?.id, existing.id);
});

test("新規チャットはcapturedかつ受諾済みの注文だけに許可する", () => {
  const accepted = {
    status: "accepted_captured",
    payment_status: "captured",
    accepted_at: "2026-08-05T00:00:00.000Z",
  };
  assert.equal(canCreateOrderChatForOrder(accepted), true);
  assert.equal(
    canCreateOrderChatForOrder({ ...accepted, status: "completed" }),
    true
  );
  assert.equal(
    canCreateOrderChatForOrder({ ...accepted, payment_status: "authorized" }),
    false
  );
  assert.equal(canCreateOrderChatForOrder({ ...accepted, accepted_at: null }), false);

  for (const status of [
    "pending",
    "rejected",
    "checkout_pending",
    "authorized_pending_creator",
    "declined_canceled",
    "expired_canceled",
    "canceled",
    "cancelled",
    "capture_failed",
    "refunded",
    "unknown_status",
  ]) {
    assert.equal(
      canCreateOrderChatForOrder({ ...accepted, status }),
      false,
      status
    );
  }
});

test("CreatorとCompanyだけを注文チャット参加者として許可する", () => {
  assert.equal(isOrderChatParticipant(order(), "creator-user"), true);
  assert.equal(isOrderChatParticipant(order(), "company-user"), true);
  assert.equal(isOrderChatParticipant(order(), "third-party"), false);
});

test("参加者が一致しない既存チャットを安全に拒否する", async () => {
  const memory = createMemoryStore();
  memory.chats.set("wrong-chat", {
    id: "wrong-chat",
    request_id: null,
    order_id: order().id,
    company_user_id: "other-company",
    creator_user_id: "creator-user",
    created_at: "2026-08-04T00:00:00.000Z",
    last_message_at: null,
  });

  await assert.rejects(
    getExistingOrderChat(memory.store, order()),
    /order_chat_participant_mismatch/
  );
});

test("チャット作成失敗を成功扱いにしない", async () => {
  const memory = createMemoryStore({ failInsert: true });
  await assert.rejects(
    ensureOrderChat(memory.store, order()),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "50000"
  );
});

test("メッセージ0件でも双方を紐づけたチャット自体は存在する", async () => {
  const memory = createMemoryStore();
  const result = await ensureOrderChat(memory.store, order());

  assert.equal(memory.chats.has(result.chat.id), true);
  assert.equal(result.chat.last_message_at, null);
  assert.deepEqual(
    [result.chat.company_user_id, result.chat.creator_user_id].sort(),
    ["company-user", "creator-user"].sort()
  );
});
