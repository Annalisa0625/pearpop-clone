import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  OrderPaymentAction,
  OrderPaymentActionRow,
  OrderPaymentActionStore,
  OrderPaymentActionWorkType,
} from "@/lib/orders/order-payment-action";

function claimIdentity(order: OrderPaymentActionRow) {
  if (
    !order.stripe_payment_intent_id ||
    !order.creator_accept_deadline ||
    !Number.isInteger(order.stripe_amount) ||
    order.stripe_amount === null ||
    !order.currency
  ) {
    throw new Error("order_payment_action_identity_missing");
  }
  return {
    paymentIntentId: order.stripe_payment_intent_id,
    creatorAcceptDeadline: order.creator_accept_deadline,
    amount: order.stripe_amount,
    currency: order.currency,
  };
}

function rpcIdentity(order: OrderPaymentActionRow) {
  const identity = claimIdentity(order);
  return {
    p_expected_amount: identity.amount,
    p_expected_company_user_id: order.b_user_id,
    p_expected_creator_accept_deadline: identity.creatorAcceptDeadline,
    p_expected_creator_user_id: order.creator_user_id,
    p_expected_currency: identity.currency,
    p_expected_payment_intent_id: identity.paymentIntentId,
    p_order_id: order.id,
  };
}

export const orderPaymentActionStore: OrderPaymentActionStore = {
  async claim(args) {
    if (
      (args.action === "auto_cancel" && args.expectedCreatorUserId !== null) ||
      (args.action !== "auto_cancel" &&
        args.expectedCreatorUserId !== args.order.creator_user_id)
    ) {
      return { claimed: false, previousAction: null };
    }
    const { data, error } = await supabaseAdmin.rpc("claim_order_payment_action", {
      ...rpcIdentity(args.order),
      p_action: args.action,
      p_claim_token: args.claimToken,
    });
    if (error) throw error;
    const result = data?.[0];
    return {
      claimed: result?.claimed === true,
      previousAction: (result?.previous_action as OrderPaymentAction | null) ?? null,
    };
  },

  async startExecution(args) {
    const { data, error } = await supabaseAdmin.rpc("start_order_payment_action_execution", {
      ...rpcIdentity(args.order),
      p_action: args.action,
      p_claim_token: args.claimToken,
    });
    if (error) throw error;
    const result = data?.[0];
    return {
      started: result?.started === true,
      reason: result?.reason === "deadline_expired" ? "deadline_expired" :
        result?.started === true ? "started" : "conflict",
    };
  },

  async verifyExecution(args) {
    const { data, error } = await supabaseAdmin.rpc("verify_order_payment_action_execution", {
      ...rpcIdentity(args.order),
      p_action: args.action,
      p_claim_token: args.claimToken,
    });
    if (error) throw error;
    return data?.[0]?.authorized === true;
  },

  async finalizeAccepted(args) {
    const { data, error } = await supabaseAdmin.rpc("finalize_order_payment_action", {
      ...rpcIdentity(args.order),
      p_action: args.action,
      p_claim_token: args.claimToken,
      p_cancel_action: null,
      p_outcome: "accepted",
      p_stripe_status: args.stripeStatus,
    });
    if (error) throw error;
    return data?.[0]?.finalized === true;
  },

  async finalizeCanceled(args) {
    const { data, error } = await supabaseAdmin.rpc("finalize_order_payment_action", {
      ...rpcIdentity(args.order),
      p_action: args.action,
      p_claim_token: args.claimToken,
      p_cancel_action: args.canceledAction,
      p_outcome: "canceled",
      p_stripe_status: args.stripeStatus,
    });
    if (error) throw error;
    return data?.[0]?.finalized === true;
  },
};

export async function clearStaleOrderPaymentActionClaims() {
  const { data, error } = await supabaseAdmin.rpc("clear_stale_order_payment_action_claims", {});
  if (error) throw error;
  return data?.[0]?.cleared_count ?? 0;
}

export async function claimOrderPaymentActionWorkBatch(args: {
  workType: OrderPaymentActionWorkType;
  batchSize: number;
  retryAfterSeconds: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("claim_order_payment_action_work", {
    p_batch_size: args.batchSize,
    p_retry_after_seconds: args.retryAfterSeconds,
    p_work_type: args.workType,
  });
  if (error) throw error;
  return (data ?? []).map((row) => row.order_id);
}

export function asOrderPaymentActionRow(order: OrderPaymentActionRow) {
  return order;
}
