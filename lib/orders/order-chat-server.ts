import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createOrderChat,
  ensureOrderChat,
  getExistingOrderChat,
  type OrderChatInsert,
  type OrderChatRow,
  type OrderChatSource,
} from "@/lib/orders/order-chat";

const ORDER_CHAT_SELECT =
  "id, request_id, order_id, company_user_id, creator_user_id, created_at, last_message_at";

const orderChatStore = {
  findByOrderId: async (orderId: string) => {
    const { data, error } = await supabaseAdmin
      .from("chats")
      .select(ORDER_CHAT_SELECT)
      .eq("order_id", orderId)
      .maybeSingle();
    return { data: (data as OrderChatRow | null) ?? null, error };
  },
  insert: async (input: OrderChatInsert) => {
    const { data, error } = await supabaseAdmin
      .from("chats")
      .insert(input)
      .select(ORDER_CHAT_SELECT)
      .single();
    return { data: (data as OrderChatRow | null) ?? null, error };
  },
};

export function getOrderChatForOrder(order: OrderChatSource) {
  return getExistingOrderChat(orderChatStore, order);
}

export function createOrderChatForOrder(order: OrderChatSource) {
  return createOrderChat(orderChatStore, order);
}

export function ensureOrderChatForOrder(order: OrderChatSource) {
  return ensureOrderChat(orderChatStore, order);
}
