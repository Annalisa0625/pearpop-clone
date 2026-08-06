// File: app/api/admin/orders/auto-cancel-unaccepted/route.ts
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  executeOrderPaymentAction,
  OrderPaymentActionError,
  processClaimedWorkBatches,
  type OrderPaymentAction,
  type OrderPaymentActionGateway,
  type OrderPaymentActionRow,
  type OrderPaymentActionWorkType,
} from "@/lib/orders/order-payment-action";
import { completeOrderPaymentActionEffects } from "@/lib/orders/order-payment-action-effects";
import {
  clearStaleOrderPaymentActionClaims,
  claimOrderPaymentActionWorkBatch,
  orderPaymentActionStore,
} from "@/lib/orders/order-payment-action-server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PaymentActionOrder = OrderPaymentActionRow & {
  stripe_payment_status: string | null;
};
type AuthResult = {
  ok: boolean;
  actorUserId: string | null;
  authType: "admin" | "cron" | null;
  error?: string;
  status?: number;
};

const ORDER_SELECT = `
  id, b_user_id, creator_user_id, creator_menu_id,
  trendre_link_quote_id, trendre_link_inquiry_id,
  status, payment_status, stripe_payment_intent_id,
  stripe_payment_status, stripe_amount, currency,
  creator_accept_deadline, payment_action_type,
  payment_action_token, payment_action_state,
  payment_action_started_at, payment_action_execution_started_at,
  payment_action_updated_at, payment_action_effects_completed_at,
  payment_action_reconcile_attempted_at,
  payment_action_effects_attempted_at,
  payment_action_auto_cancel_attempted_at
`;

const WORK_BATCH_SIZE = 25;
const MAX_WORK_BATCHES = 5;
const EXECUTING_RETRY_SECONDS = 60;
const EFFECTS_RETRY_SECONDS = 5 * 60;
const AUTO_CANCEL_RETRY_SECONDS = 5 * 60;

function getBearerToken(request: NextRequest) {
  const token = (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return token || null;
}

async function authenticateAdminOrCron(request: NextRequest): Promise<AuthResult> {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, actorUserId: null, authType: null, error: "認証トークンがありません。", status: 401 };
  }
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && token === cronSecret) {
    return { ok: true, actorUserId: null, authType: "cron" };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return { ok: false, actorUserId: null, authType: null, error: "認証に失敗しました。", status: 401 };
  }
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError) {
    console.error("auto cancel admin role check error:", roleError);
    return { ok: false, actorUserId: null, authType: null, error: "管理者権限の確認に失敗しました。", status: 500 };
  }
  if (!roleRow) {
    return { ok: false, actorUserId: null, authType: null, error: "管理者のみ実行できます。", status: 403 };
  }
  return { ok: true, actorUserId: user.id, authType: "admin" };
}

function stripeGateway(action: OrderPaymentAction): OrderPaymentActionGateway {
  const stripe = getStripe();
  return {
    retrieve: (id) => stripe.paymentIntents.retrieve(id),
    capture: (id, key) => stripe.paymentIntents.capture(id, {}, { idempotencyKey: key }),
    cancel: (id, key) => stripe.paymentIntents.cancel(
      id,
      { cancellation_reason: action === "decline" ? "requested_by_customer" : "abandoned" },
      { idempotencyKey: key }
    ),
  };
}

async function completeResultEffects(
  order: PaymentActionOrder,
  result: Awaited<ReturnType<typeof executeOrderPaymentAction>>,
  actorUserId: string | null
) {
  if (result.kind === "accepted") {
    await completeOrderPaymentActionEffects({
      order,
      outcome: { kind: "accepted", stripeStatus: result.stripeStatus },
      actorUserId,
    });
  } else if (result.kind === "canceled") {
    await completeOrderPaymentActionEffects({
      order,
      outcome: {
        kind: "canceled",
        action: result.action,
        stripeStatus: result.stripeStatus,
      },
      actorUserId,
    });
  }
}

async function claimAndLoadWorkBatch(
  workType: OrderPaymentActionWorkType,
  retryAfterSeconds: number,
  batchSize: number
) {
  const orderIds = await claimOrderPaymentActionWorkBatch({
    workType,
    batchSize,
    retryAfterSeconds,
  });
  if (orderIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_SELECT)
    .in("id", orderIds);
  if (error) throw error;

  const byId = new Map(
    ((data ?? []) as PaymentActionOrder[]).map((order) => [order.id, order])
  );
  return orderIds
    .map((id) => byId.get(id))
    .filter((order): order is PaymentActionOrder => order !== undefined);
}

async function reconcileExecutingOrders(actorUserId: string | null) {
  const recoveredIds: string[] = [];
  const pendingIds: string[] = [];
  const batches = await processClaimedWorkBatches({
    batchSize: WORK_BATCH_SIZE,
    maxBatches: MAX_WORK_BATCHES,
    claimBatch: (batchSize) => claimAndLoadWorkBatch(
      "executing",
      EXECUTING_RETRY_SECONDS,
      batchSize
    ),
    processItem: async (order) => {
      const action = order.payment_action_type;
      const claimToken = order.payment_action_token;
      if (!action || !claimToken) {
        pendingIds.push(order.id);
        return;
      }
      const result = await executeOrderPaymentAction({
        order,
        action,
        claimToken,
        expectedCreatorUserId: action === "auto_cancel" ? null : order.creator_user_id,
        resumeExecution: true,
        store: orderPaymentActionStore,
        gateway: stripeGateway(action),
      });
      if (result.kind === "accepted" || result.kind === "canceled") {
        await completeResultEffects(order, result, actorUserId);
        recoveredIds.push(order.id);
      } else {
        pendingIds.push(order.id);
      }
    },
    onItemError: (order, error) => {
      console.error("order payment action reconcile error:", { orderId: order.id, error });
      pendingIds.push(order.id);
    },
  });
  return { recoveredIds, pendingIds, batches };
}

async function repairTerminalEffects(actorUserId: string | null) {
  const repairedIds: string[] = [];
  const failedIds: string[] = [];
  const batches = await processClaimedWorkBatches({
    batchSize: WORK_BATCH_SIZE,
    maxBatches: MAX_WORK_BATCHES,
    claimBatch: (batchSize) => claimAndLoadWorkBatch(
      "effects",
      EFFECTS_RETRY_SECONDS,
      batchSize
    ),
    processItem: async (order) => {
      if (order.status === "accepted_captured" && order.payment_status === "captured") {
        await completeOrderPaymentActionEffects({
          order,
          outcome: { kind: "accepted", stripeStatus: "succeeded" },
          actorUserId,
        });
      } else if (
        order.payment_status === "canceled" &&
        (order.status === "declined_canceled" || order.status === "expired_canceled")
      ) {
        await completeOrderPaymentActionEffects({
          order,
          outcome: {
            kind: "canceled",
            action: order.status === "declined_canceled" ? "decline" : "auto_cancel",
            stripeStatus: "canceled",
          },
          actorUserId,
        });
      } else {
        throw new Error("order_payment_action_effect_state_invalid");
      }
      repairedIds.push(order.id);
    },
    onItemError: (order, error) => {
      console.error("order payment action side-effect repair error:", { orderId: order.id, error });
      failedIds.push(order.id);
    },
  });
  return { repairedIds, failedIds, batches };
}

async function autoCancelDueOrders(actorUserId: string | null) {
  const canceledIds: string[] = [];
  const skippedIds: string[] = [];
  const batches = await processClaimedWorkBatches({
    batchSize: WORK_BATCH_SIZE,
    maxBatches: MAX_WORK_BATCHES,
    claimBatch: (batchSize) => claimAndLoadWorkBatch(
      "auto_cancel",
      AUTO_CANCEL_RETRY_SECONDS,
      batchSize
    ),
    processItem: async (order) => {
      const result = await executeOrderPaymentAction({
        order,
        action: "auto_cancel",
        claimToken: randomUUID(),
        expectedCreatorUserId: null,
        store: orderPaymentActionStore,
        gateway: stripeGateway("auto_cancel"),
      });
      if (result.kind !== "canceled") {
        if (result.kind === "accepted") {
          await completeResultEffects(order, result, actorUserId);
        }
        skippedIds.push(order.id);
        return;
      }
      await completeResultEffects(order, result, actorUserId);
      canceledIds.push(order.id);
    },
    onItemError: (order, error) => {
      if (!(error instanceof OrderPaymentActionError && error.code === "deadline_not_expired")) {
        console.error("auto cancel single order error:", { orderId: order.id, error });
      }
      skippedIds.push(order.id);
    },
  });
  return { canceledIds, skippedIds, batches };
}

async function reconcileAndAutoCancelOrders(actorUserId: string | null) {
  const scannedAt = new Date().toISOString();
  const clearedStaleClaimCount = await clearStaleOrderPaymentActionClaims();
  const executing = await reconcileExecutingOrders(actorUserId);
  const due = await autoCancelDueOrders(actorUserId);
  const effects = await repairTerminalEffects(actorUserId);
  return {
    scannedAt,
    clearedStaleClaimCount,
    recoveredOrderIds: executing.recoveredIds,
    pendingRecoveryOrderIds: executing.pendingIds,
    executingBatchStats: executing.batches,
    canceledCount: due.canceledIds.length,
    canceledOrderIds: due.canceledIds,
    skippedOrderIds: due.skippedIds,
    autoCancelBatchStats: due.batches,
    repairedEffectOrderIds: effects.repairedIds,
    failedEffectOrderIds: effects.failedIds,
    effectBatchStats: effects.batches,
  };
}

async function handleReconcileRequest(request: NextRequest) {
  try {
    const auth = await authenticateAdminOrCron(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status ?? 401 });
    }
    return NextResponse.json({
      ok: true,
      authType: auth.authType,
      ...(await reconcileAndAutoCancelOrders(auth.actorUserId)),
    });
  } catch (error) {
    console.error("auto cancel/reconcile unaccepted orders error:", error);
    return NextResponse.json({ ok: false, error: "未受諾注文の決済復旧処理に失敗しました。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleReconcileRequest(request);
}

// Vercel Cron invokes configured paths with GET and attaches CRON_SECRET as a
// Bearer token. Keep POST for manual admin retries, but route both methods
// through the exact same authentication boundary and reconciler.
export async function GET(request: NextRequest) {
  return handleReconcileRequest(request);
}
