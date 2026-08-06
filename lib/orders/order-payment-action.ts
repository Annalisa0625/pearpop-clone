export type OrderPaymentAction = "accept" | "decline" | "auto_cancel";
export type OrderPaymentActionState = "claimed" | "executing";

export type OrderPaymentActionRow = {
  id: string;
  b_user_id: string;
  creator_user_id: string;
  creator_menu_id: string | null;
  trendre_link_quote_id: string | null;
  trendre_link_inquiry_id: string | null;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_amount: number | null;
  currency: string | null;
  creator_accept_deadline: string | null;
  payment_action_type?: OrderPaymentAction | null;
  payment_action_token?: string | null;
  payment_action_state?: OrderPaymentActionState | null;
  payment_action_started_at?: string | null;
  payment_action_execution_started_at?: string | null;
  payment_action_updated_at?: string | null;
  payment_action_effects_completed_at?: string | null;
  payment_action_reconcile_attempted_at?: string | null;
  payment_action_effects_attempted_at?: string | null;
  payment_action_auto_cancel_attempted_at?: string | null;
};

export type OrderPaymentActionWorkType = "executing" | "effects" | "auto_cancel";

export type OrderPaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  capture_method: string;
  metadata: Record<string, string>;
};

type ActionIdentity = {
  order: OrderPaymentActionRow;
  action: OrderPaymentAction;
  claimToken: string;
};

export type OrderPaymentActionStore = {
  claim(args: ActionIdentity & { expectedCreatorUserId: string | null }): Promise<{
    claimed: boolean;
    previousAction: OrderPaymentAction | null;
  }>;
  startExecution(args: ActionIdentity): Promise<{
    started: boolean;
    reason: "started" | "deadline_expired" | "conflict";
  }>;
  verifyExecution(args: ActionIdentity): Promise<boolean>;
  finalizeAccepted(args: ActionIdentity & {
    stripeStatus: string;
    nowIso: string;
  }): Promise<boolean>;
  finalizeCanceled(args: ActionIdentity & {
    canceledAction: "decline" | "auto_cancel";
    stripeStatus: string;
    nowIso: string;
  }): Promise<boolean>;
};

export type OrderPaymentActionGateway = {
  retrieve(paymentIntentId: string): Promise<OrderPaymentIntent>;
  capture(paymentIntentId: string, idempotencyKey: string): Promise<OrderPaymentIntent>;
  cancel(paymentIntentId: string, idempotencyKey: string): Promise<OrderPaymentIntent>;
};

export type OrderPaymentActionResult =
  | { kind: "accepted"; action: OrderPaymentAction; stripeStatus: "succeeded"; recovered: boolean }
  | {
      kind: "canceled";
      action: "decline" | "auto_cancel";
      stripeStatus: "canceled";
      recovered: boolean;
    }
  | { kind: "processing"; action: OrderPaymentAction; stripeStatus: "processing" }
  | { kind: "conflict" };

export type OrderPaymentActionEffectPlan = {
  terminalEvent: string;
  requiresChat: boolean;
};

export function paymentActionEffectPlan(args: {
  kind: "accepted" | "canceled";
  action: OrderPaymentAction;
}): OrderPaymentActionEffectPlan {
  if (args.kind === "accepted") {
    return { terminalEvent: "creator_accepted_and_stripe_captured", requiresChat: true };
  }
  return {
    terminalEvent: args.action === "decline"
      ? "creator_declined_and_stripe_canceled"
      : "order_auto_canceled_unaccepted_after_72h",
    requiresChat: false,
  };
}

export async function completePaymentActionSideEffects(args: {
  plan: OrderPaymentActionEffectPlan;
  ensureTerminalEvent(): Promise<void>;
  ensureChat(): Promise<void>;
  markComplete(): Promise<void>;
}) {
  await args.ensureTerminalEvent();
  if (args.plan.requiresChat) await args.ensureChat();
  await args.markComplete();
}

export async function processClaimedWorkBatches<T>(args: {
  batchSize: number;
  maxBatches: number;
  claimBatch(batchSize: number): Promise<T[]>;
  processItem(item: T): Promise<void>;
  onItemError(item: T, error: unknown): void;
}) {
  let batchCount = 0;
  let claimedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;

  while (batchCount < args.maxBatches) {
    const batch = await args.claimBatch(args.batchSize);
    if (batch.length === 0) break;
    batchCount += 1;
    claimedCount += batch.length;

    for (const item of batch) {
      try {
        await args.processItem(item);
        succeededCount += 1;
      } catch (error) {
        failedCount += 1;
        args.onItemError(item, error);
      }
    }

    if (batch.length < args.batchSize) break;
  }

  return { batchCount, claimedCount, succeededCount, failedCount };
}

export class OrderPaymentActionError extends Error {
  readonly code:
    | "deadline_missing"
    | "deadline_expired"
    | "deadline_not_expired"
    | "invalid_order_state"
    | "payment_intent_missing"
    | "payment_intent_mismatch"
    | "payment_intent_invalid_state"
    | "execution_fenced"
    | "finalize_failed";

  constructor(code: OrderPaymentActionError["code"]) {
    super(code);
    this.code = code;
  }
}

export function isCreatorAcceptDeadlineOpen(deadline: string | null, now: Date) {
  if (!deadline) return false;
  const deadlineTime = Date.parse(deadline);
  return Number.isFinite(deadlineTime) && now.getTime() < deadlineTime;
}

export function orderCaptureIdempotencyKey(orderId: string, paymentIntentId: string) {
  return `creator-order-capture/${orderId}/${paymentIntentId}`;
}

export function orderCancelIdempotencyKey(
  orderId: string,
  paymentIntentId: string,
  action: "decline" | "auto_cancel"
) {
  return `creator-order-cancel/${action}/${orderId}/${paymentIntentId}`;
}

export function orderPaymentActionEventDedupeKey(
  orderId: string,
  action: "accept" | "decline" | "auto_cancel"
) {
  return `order-payment-action/${orderId}/${action}`;
}

function assertOrderIdentity(order: OrderPaymentActionRow) {
  if (
    order.status !== "authorized_pending_creator" ||
    order.payment_status !== "authorized"
  ) {
    throw new OrderPaymentActionError("invalid_order_state");
  }
  if (!order.stripe_payment_intent_id) {
    throw new OrderPaymentActionError("payment_intent_missing");
  }
  if (
    !Number.isInteger(order.stripe_amount) ||
    order.stripe_amount === null ||
    order.stripe_amount <= 0 ||
    !order.currency?.trim()
  ) {
    throw new OrderPaymentActionError("payment_intent_mismatch");
  }
  if (!order.creator_accept_deadline || !Number.isFinite(Date.parse(order.creator_accept_deadline))) {
    throw new OrderPaymentActionError("deadline_missing");
  }
}

function assertFreshActionDeadline(
  order: OrderPaymentActionRow,
  action: OrderPaymentAction,
  now: Date
) {
  const open = isCreatorAcceptDeadlineOpen(order.creator_accept_deadline, now);
  if ((action === "accept" || action === "decline") && !open) {
    throw new OrderPaymentActionError("deadline_expired");
  }
  if (action === "auto_cancel" && open) {
    throw new OrderPaymentActionError("deadline_not_expired");
  }
}

export function assertPaymentIntentMatchesOrder(
  intent: OrderPaymentIntent,
  order: OrderPaymentActionRow
) {
  const expectedAmount = order.stripe_amount;
  const expectedCurrency = order.currency?.toUpperCase() ?? "";
  const metadata = intent.metadata ?? {};
  const isLinkOrder = order.creator_menu_id === null &&
    typeof order.trendre_link_quote_id === "string" &&
    order.trendre_link_quote_id.length > 0 &&
    typeof order.trendre_link_inquiry_id === "string" &&
    order.trendre_link_inquiry_id.length > 0;
  const isMenuOrder = typeof order.creator_menu_id === "string" &&
    order.creator_menu_id.length > 0 &&
    order.trendre_link_quote_id === null &&
    order.trendre_link_inquiry_id === null;
  const originMatches = isLinkOrder
    ? metadata.source === "trendre_link_quote" &&
      metadata.trendre_link_quote_id === order.trendre_link_quote_id &&
      metadata.trendre_link_inquiry_id === order.trendre_link_inquiry_id &&
      !("order_id" in metadata)
    : isMenuOrder &&
      metadata.order_id === order.id &&
      !("source" in metadata) &&
      !("trendre_link_quote_id" in metadata) &&
      !("trendre_link_inquiry_id" in metadata);
  if (
    intent.id !== order.stripe_payment_intent_id ||
    intent.capture_method !== "manual" ||
    !Number.isInteger(expectedAmount) ||
    expectedAmount === null ||
    expectedAmount <= 0 ||
    intent.amount !== expectedAmount ||
    intent.currency.toUpperCase() !== expectedCurrency ||
    metadata.b_user_id !== order.b_user_id ||
    metadata.creator_user_id !== order.creator_user_id ||
    !originMatches
  ) {
    throw new OrderPaymentActionError("payment_intent_mismatch");
  }
}

function canceledAction(action: OrderPaymentAction): "decline" | "auto_cancel" {
  return action === "decline" ? "decline" : "auto_cancel";
}

export async function executeOrderPaymentAction(args: {
  order: OrderPaymentActionRow;
  action: OrderPaymentAction;
  claimToken: string;
  expectedCreatorUserId: string | null;
  resumeExecution?: boolean;
  now?: Date;
  store: OrderPaymentActionStore;
  gateway: OrderPaymentActionGateway;
}): Promise<OrderPaymentActionResult> {
  assertOrderIdentity(args.order);

  if (!args.resumeExecution) {
    assertFreshActionDeadline(args.order, args.action, args.now ?? new Date());
    const claimed = await args.store.claim({
      order: args.order,
      action: args.action,
      claimToken: args.claimToken,
      expectedCreatorUserId: args.expectedCreatorUserId,
    });
    if (!claimed.claimed) return { kind: "conflict" };

    // This RPC is the authoritative deadline decision. For accept it uses
    // clock_timestamp() < creator_accept_deadline. A claim obtained before the
    // deadline cannot execute after the deadline.
    const execution = await args.store.startExecution({
      order: args.order,
      action: args.action,
      claimToken: args.claimToken,
    });
    if (!execution.started) {
      if (execution.reason === "deadline_expired") {
        throw new OrderPaymentActionError("deadline_expired");
      }
      return { kind: "conflict" };
    }
  } else {
    const verified = await args.store.verifyExecution({
      order: args.order,
      action: args.action,
      claimToken: args.claimToken,
    });
    if (!verified) return { kind: "conflict" };
  }

  const paymentIntentId = args.order.stripe_payment_intent_id;
  if (!paymentIntentId) throw new OrderPaymentActionError("payment_intent_missing");

  const finalize = async (
    intent: OrderPaymentIntent,
    recovered: boolean
  ): Promise<OrderPaymentActionResult> => {
    assertPaymentIntentMatchesOrder(intent, args.order);
    const nowIso = new Date().toISOString();

    if (intent.status === "processing") {
      return { kind: "processing", action: args.action, stripeStatus: "processing" };
    }
    if (intent.status === "succeeded") {
      const finalized = await args.store.finalizeAccepted({
        order: args.order,
        action: args.action,
        claimToken: args.claimToken,
        stripeStatus: intent.status,
        nowIso,
      });
      if (!finalized) throw new OrderPaymentActionError("finalize_failed");
      return { kind: "accepted", action: args.action, stripeStatus: "succeeded", recovered };
    }
    if (intent.status === "canceled") {
      const action = canceledAction(args.action);
      const finalized = await args.store.finalizeCanceled({
        order: args.order,
        action: args.action,
        canceledAction: action,
        claimToken: args.claimToken,
        stripeStatus: intent.status,
        nowIso,
      });
      if (!finalized) throw new OrderPaymentActionError("finalize_failed");
      return { kind: "canceled", action, stripeStatus: "canceled", recovered };
    }
    throw new OrderPaymentActionError("payment_intent_invalid_state");
  };

  try {
    let intent = await args.gateway.retrieve(paymentIntentId);
    assertPaymentIntentMatchesOrder(intent, args.order);

    if (intent.status === "requires_capture") {
      // This write-based RPC is the final fence immediately before a Stripe
      // mutation. It never changes the token. A stale token therefore cannot
      // reach capture/cancel, while a reconciler uses the same action and key.
      const authorized = await args.store.verifyExecution({
        order: args.order,
        action: args.action,
        claimToken: args.claimToken,
      });
      if (!authorized) throw new OrderPaymentActionError("execution_fenced");

      intent = args.action === "accept"
        ? await args.gateway.capture(
            paymentIntentId,
            orderCaptureIdempotencyKey(args.order.id, paymentIntentId)
          )
        : await args.gateway.cancel(
            paymentIntentId,
            orderCancelIdempotencyKey(args.order.id, paymentIntentId, args.action)
          );
      return finalize(intent, false);
    }

    if (["succeeded", "canceled", "processing"].includes(intent.status)) {
      return finalize(intent, true);
    }
    throw new OrderPaymentActionError("payment_intent_invalid_state");
  } catch (error) {
    if (error instanceof OrderPaymentActionError) throw error;

    try {
      const recoveredIntent = await args.gateway.retrieve(paymentIntentId);
      assertPaymentIntentMatchesOrder(recoveredIntent, args.order);
      if (["succeeded", "canceled", "processing"].includes(recoveredIntent.status)) {
        return finalize(recoveredIntent, true);
      }
    } catch (recoveryError) {
      if (recoveryError instanceof OrderPaymentActionError) throw recoveryError;
    }

    // Ambiguous or non-terminal Stripe results deliberately retain executing.
    // The admin/cron reconciler retries with this exact action, token, and
    // idempotency key; no opposing action is allowed to steal it.
    throw error;
  }
}
