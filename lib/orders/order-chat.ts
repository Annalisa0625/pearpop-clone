import { insertOrRecoverUnique, type DatabaseResult } from "../db/unique-insert";

export type OrderChatSource = {
  id: string;
  b_user_id: string;
  creator_user_id: string;
  creator_menu_id: string | null;
};

export type OrderChatAvailability = {
  status: string;
  payment_status: string;
  accepted_at: string | null;
};

export type OrderChatRow = {
  id: string;
  request_id: string | null;
  order_id: string | null;
  company_user_id: string;
  creator_user_id: string;
  created_at: string;
  last_message_at: string | null;
};

export type OrderChatInsert = {
  id: string;
  request_id: null;
  order_id: string;
  company_user_id: string;
  creator_user_id: string;
  last_message_at: null;
};

export type OrderChatStore = {
  findByOrderId: (orderId: string) => Promise<DatabaseResult<OrderChatRow>>;
  insert: (input: OrderChatInsert) => Promise<DatabaseResult<OrderChatRow>>;
};

function matchesOrderParticipants(chat: OrderChatRow, order: OrderChatSource) {
  return (
    chat.order_id === order.id &&
    chat.company_user_id === order.b_user_id &&
    chat.creator_user_id === order.creator_user_id
  );
}

const ORDER_CHAT_CREATABLE_STATUSES = new Set([
  "accepted_captured",
  "in_progress",
  "delivered",
  "revision_requested",
  "completed",
]);

export function isOrderChatParticipant(
  order: Pick<OrderChatSource, "b_user_id" | "creator_user_id">,
  userId: string
) {
  return order.b_user_id === userId || order.creator_user_id === userId;
}

export function canCreateOrderChatForOrder(order: OrderChatAvailability) {
  return (
    order.payment_status === "captured" &&
    typeof order.accepted_at === "string" &&
    order.accepted_at.trim().length > 0 &&
    ORDER_CHAT_CREATABLE_STATUSES.has(order.status)
  );
}

export async function getExistingOrderChat(
  store: OrderChatStore,
  order: OrderChatSource
): Promise<OrderChatRow | null> {
  const existing = await store.findByOrderId(order.id);
  if (existing.error) throw existing.error;
  if (!existing.data) return null;
  if (!matchesOrderParticipants(existing.data, order)) {
    throw new Error("order_chat_participant_mismatch");
  }
  return existing.data;
}

export async function createOrderChat(
  store: OrderChatStore,
  order: OrderChatSource
): Promise<{ chat: OrderChatRow; created: boolean }> {
  const result = await insertOrRecoverUnique({
    insert: () =>
      store.insert({
        // The order UUID is deterministic, so concurrent creators contend on
        // the chats primary key even when order_id has no unique constraint.
        id: order.id,
        request_id: null,
        order_id: order.id,
        company_user_id: order.b_user_id,
        creator_user_id: order.creator_user_id,
        last_message_at: null,
      }),
    recover: () => store.findByOrderId(order.id),
    validateRecovered: (chat) => matchesOrderParticipants(chat, order),
    missingError: "order_chat_create_failed",
  });

  return { chat: result.value, created: !result.duplicate };
}

export async function ensureOrderChat(
  store: OrderChatStore,
  order: OrderChatSource
): Promise<{ chat: OrderChatRow; created: boolean }> {
  const existing = await getExistingOrderChat(store, order);
  return existing
    ? { chat: existing, created: false }
    : createOrderChat(store, order);
}
