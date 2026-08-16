import { ensureOrderChatForOrder } from "@/lib/orders/order-chat-server";
import {
  completePaymentActionSideEffects,
  orderPaymentActionEventDedupeKey,
  paymentActionEffectPlan,
  type OrderPaymentActionRow,
} from "@/lib/orders/order-payment-action";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Json } from "@/types/database.types";

export type OrderPaymentTerminalOutcome =
  | { kind: "accepted"; stripeStatus: "succeeded" }
  | {
      kind: "canceled";
      action: "decline" | "auto_cancel";
      stripeStatus: "canceled";
    };

export function terminalOrderState(outcome: OrderPaymentTerminalOutcome) {
  if (outcome.kind === "accepted") {
    return { status: "accepted_captured", paymentStatus: "captured" } as const;
  }
  return {
    status: outcome.action === "decline" ? "declined_canceled" : "expired_canceled",
    paymentStatus: "canceled",
  } as const;
}

async function upsertRequiredOrderEvent(args: {
  orderId: string;
  actorUserId: string | null;
  eventType: string;
  dedupeKey: string;
  eventData: Json;
}) {
  const { error } = await supabaseAdmin.from("order_events").upsert({
    order_id: args.orderId,
    actor_user_id: args.actorUserId,
    event_type: args.eventType,
    event_data: args.eventData,
    dedupe_key: args.dedupeKey,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw error;
}

export async function completeOrderPaymentActionEffects(args: {
  order: OrderPaymentActionRow;
  outcome: OrderPaymentTerminalOutcome;
  actorUserId: string | null;
}) {
  const terminal = terminalOrderState(args.outcome);
  let chatId: string | null = null;
  const action = args.outcome.kind === "accepted" ? "accept" : args.outcome.action;

  await completePaymentActionSideEffects({
    plan: paymentActionEffectPlan({ kind: args.outcome.kind, action }),
    ensureTerminalEvent: () => upsertRequiredOrderEvent({
      orderId: args.order.id,
      actorUserId: action === "auto_cancel"
        ? args.actorUserId
        : args.order.creator_user_id,
      eventType: paymentActionEffectPlan({ kind: args.outcome.kind, action }).terminalEvent,
      dedupeKey: orderPaymentActionEventDedupeKey(args.order.id, action),
      eventData: {
        stripe_payment_intent_id: args.order.stripe_payment_intent_id,
        stripe_payment_intent_status: args.outcome.stripeStatus,
        creator_accept_deadline: args.order.creator_accept_deadline,
      },
    }),
    ensureChat: async () => {
      const { chat } = await ensureOrderChatForOrder(args.order);
      chatId = chat.id;
      await upsertRequiredOrderEvent({
        orderId: args.order.id,
        actorUserId: args.actorUserId ?? args.order.creator_user_id,
        eventType: "order_chat_created",
        dedupeKey: `order-chat-created/${args.order.id}`,
        eventData: { chat_id: chat.id },
      });
    },
    markComplete: async () => {
      // The pre-existing accept/decline/auto-cancel flow has no required in-app
      // notification. Do not invent one here; order events and the accepted chat
      // are the complete existing side-effect contract.
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ payment_action_effects_completed_at: new Date().toISOString() })
        .eq("id", args.order.id)
        .eq("status", terminal.status)
        .eq("payment_status", terminal.paymentStatus)
        .eq("b_user_id", args.order.b_user_id)
        .eq("creator_user_id", args.order.creator_user_id)
        .eq("stripe_payment_intent_id", args.order.stripe_payment_intent_id ?? "")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data?.id !== args.order.id) {
        throw new Error("order_payment_action_effects_finalize_failed");
      }
    },
  });

  return { chatId };
}
