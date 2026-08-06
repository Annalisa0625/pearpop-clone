import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  completePaymentActionSideEffects,
  executeOrderPaymentAction,
  isCreatorAcceptDeadlineOpen,
  orderCancelIdempotencyKey,
  orderCaptureIdempotencyKey,
  orderPaymentActionEventDedupeKey,
  paymentActionEffectPlan,
  processClaimedWorkBatches,
  OrderPaymentActionError,
  type OrderPaymentAction,
  type OrderPaymentActionGateway,
  type OrderPaymentActionRow,
  type OrderPaymentActionState,
  type OrderPaymentActionStore,
  type OrderPaymentIntent,
} from "../lib/orders/order-payment-action.ts";
import { isOrderCreator } from "../lib/orders/order-acceptance.ts";

const orderId = "11111111-1111-4111-8111-111111111111";
const deadline = "2026-08-10T00:00:00.000Z";
const beforeDeadline = new Date("2026-08-09T23:59:59.999Z");
const atDeadline = new Date(deadline);

function order(overrides: Partial<OrderPaymentActionRow> = {}): OrderPaymentActionRow {
  return {
    id: orderId,
    b_user_id: "company-user",
    creator_user_id: "creator-user",
    creator_menu_id: "menu-id",
    trendre_link_quote_id: null,
    trendre_link_inquiry_id: null,
    status: "authorized_pending_creator",
    payment_status: "authorized",
    stripe_payment_intent_id: "pi_order",
    stripe_amount: 12000,
    currency: "JPY",
    creator_accept_deadline: deadline,
    ...overrides,
  };
}

function intent(status = "requires_capture"): OrderPaymentIntent {
  return {
    id: "pi_order",
    status,
    amount: 12000,
    currency: "jpy",
    capture_method: "manual",
    metadata: {
      order_id: orderId,
      b_user_id: "company-user",
      creator_user_id: "creator-user",
    },
  };
}

function linkOrder(overrides: Partial<OrderPaymentActionRow> = {}) {
  return order({
    creator_menu_id: null,
    trendre_link_quote_id: "quote-id",
    trendre_link_inquiry_id: "inquiry-id",
    ...overrides,
  });
}

function linkIntent(status = "requires_capture"): OrderPaymentIntent {
  return {
    ...intent(status),
    metadata: {
      source: "trendre_link_quote",
      trendre_link_quote_id: "quote-id",
      trendre_link_inquiry_id: "inquiry-id",
      b_user_id: "company-user",
      creator_user_id: "creator-user",
    },
  };
}

class MemoryStore implements OrderPaymentActionStore {
  token: string | null = null;
  action: OrderPaymentAction | null = null;
  state: OrderPaymentActionState | null = null;
  stale = false;
  startReason: "started" | "deadline_expired" | "conflict" = "started";
  failFinalizeOnce = false;
  verifyAllowed = true;
  starts = 0;
  verifies = 0;
  acceptedFinalizations = 0;
  canceledFinalizations = 0;

  async claim(args: Parameters<OrderPaymentActionStore["claim"]>[0]) {
    if (this.state === "executing" || (this.state === "claimed" && !this.stale)) {
      return { claimed: false, previousAction: this.action };
    }
    const previousAction = this.action;
    this.action = args.action;
    this.token = args.claimToken;
    this.state = "claimed";
    this.stale = false;
    return { claimed: true, previousAction };
  }

  async startExecution(args: Parameters<OrderPaymentActionStore["startExecution"]>[0]) {
    if (
      this.startReason !== "started" ||
      this.state !== "claimed" ||
      this.action !== args.action ||
      this.token !== args.claimToken
    ) {
      return { started: false, reason: this.startReason === "started" ? "conflict" as const : this.startReason };
    }
    this.state = "executing";
    this.starts += 1;
    return { started: true, reason: "started" as const };
  }

  async verifyExecution(args: Parameters<OrderPaymentActionStore["verifyExecution"]>[0]) {
    this.verifies += 1;
    return this.verifyAllowed && this.state === "executing" &&
      this.action === args.action && this.token === args.claimToken;
  }

  async finalizeAccepted(args: Parameters<OrderPaymentActionStore["finalizeAccepted"]>[0]) {
    if (this.failFinalizeOnce) {
      this.failFinalizeOnce = false;
      return false;
    }
    if (this.state !== "executing" || this.action !== args.action || this.token !== args.claimToken) {
      return false;
    }
    this.acceptedFinalizations += 1;
    this.clear();
    return true;
  }

  async finalizeCanceled(args: Parameters<OrderPaymentActionStore["finalizeCanceled"]>[0]) {
    if (this.failFinalizeOnce) {
      this.failFinalizeOnce = false;
      return false;
    }
    if (this.state !== "executing" || this.action !== args.action || this.token !== args.claimToken) {
      return false;
    }
    this.canceledFinalizations += 1;
    this.clear();
    return true;
  }

  clear() {
    this.token = null;
    this.action = null;
    this.state = null;
  }
}

function gateway(
  initial = "requires_capture",
  valueFactory: (status: string) => OrderPaymentIntent = intent
) {
  let current = initial;
  const calls = { retrieve: 0, capture: 0, cancel: 0, captureKeys: [] as string[], cancelKeys: [] as string[] };
  const value = () => valueFactory(current);
  const implementation: OrderPaymentActionGateway = {
    retrieve: async () => { calls.retrieve += 1; return value(); },
    capture: async (_id, key) => {
      calls.capture += 1;
      calls.captureKeys.push(key);
      current = "succeeded";
      return value();
    },
    cancel: async (_id, key) => {
      calls.cancel += 1;
      calls.cancelKeys.push(key);
      current = "canceled";
      return value();
    },
  };
  return { implementation, calls, setStatus: (status: string) => { current = status; } };
}

function fixedGateway(value: OrderPaymentIntent) {
  const calls = { retrieve: 0, capture: 0, cancel: 0 };
  const implementation: OrderPaymentActionGateway = {
    retrieve: async () => { calls.retrieve += 1; return value; },
    capture: async () => { calls.capture += 1; return value; },
    cancel: async () => { calls.cancel += 1; return value; },
  };
  return { implementation, calls };
}

async function run(args: {
  action?: OrderPaymentAction;
  value?: OrderPaymentActionRow;
  store?: MemoryStore;
  gateway?: OrderPaymentActionGateway;
  now?: Date;
  token?: string;
  resumeExecution?: boolean;
} = {}) {
  const action = args.action ?? "accept";
  const store = args.store ?? new MemoryStore();
  const token = args.token ?? "claim-token";
  const value = args.value ?? order();
  if (args.resumeExecution && store.state === null) {
    store.state = "executing";
    store.action = action;
    store.token = token;
  }
  return executeOrderPaymentAction({
    order: value,
    action,
    claimToken: token,
    expectedCreatorUserId: action === "auto_cancel" ? null : "creator-user",
    resumeExecution: args.resumeExecution,
    now: args.now ?? (action === "auto_cancel" ? new Date("2026-08-10T00:00:00.001Z") : beforeDeadline),
    store,
    gateway: args.gateway ?? (
      value.trendre_link_quote_id
        ? gateway("requires_capture", linkIntent).implementation
        : gateway().implementation
    ),
  });
}

async function rejectsCode(promise: Promise<unknown>, code: OrderPaymentActionError["code"]) {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof OrderPaymentActionError && error.code === code);
}

test("期限判定はdeadline未満だけ開き、ちょうどで閉じる", () => {
  assert.equal(isCreatorAcceptDeadlineOpen(deadline, beforeDeadline), true);
  assert.equal(isCreatorAcceptDeadlineOpen(deadline, atDeadline), false);
});

test("claim後・execution開始前の停止ではStripeを呼ばない", async () => {
  const store = new MemoryStore();
  await store.claim({ order: order(), action: "accept", claimToken: "old", expectedCreatorUserId: "creator-user" });
  const g = gateway();
  assert.equal(g.calls.retrieve + g.calls.capture + g.calls.cancel, 0);
  assert.equal(store.state, "claimed");
});

test("stale claimed acceptは期限後auto-cancelが別tokenで回収できる", async () => {
  const store = new MemoryStore();
  await store.claim({ order: order(), action: "accept", claimToken: "old", expectedCreatorUserId: "creator-user" });
  store.stale = true;
  const claimed = await store.claim({ order: order(), action: "auto_cancel", claimToken: "new", expectedCreatorUserId: null });
  assert.equal(claimed.claimed, true);
  assert.equal(store.action, "auto_cancel");
  assert.equal(store.token, "new");
});

test("stale claimed declineもauto-cancelが回収できる", async () => {
  const store = new MemoryStore();
  await store.claim({ order: order(), action: "decline", claimToken: "old", expectedCreatorUserId: "creator-user" });
  store.stale = true;
  await store.claim({ order: order(), action: "auto_cancel", claimToken: "new", expectedCreatorUserId: null });
  assert.equal(store.action, "auto_cancel");
});

test("回収済みold tokenはexecution開始できずStripeへ到達しない", async () => {
  const store = new MemoryStore();
  store.state = "claimed"; store.action = "auto_cancel"; store.token = "new";
  const started = await store.startExecution({ order: order(), action: "accept", claimToken: "old" });
  assert.equal(started.started, false);
  const g = gateway();
  assert.equal(g.calls.capture, 0);
});

test("execution開始後は別actionがclaimできない", async () => {
  const store = new MemoryStore();
  await store.claim({ order: order(), action: "accept", claimToken: "fixed", expectedCreatorUserId: "creator-user" });
  await store.startExecution({ order: order(), action: "accept", claimToken: "fixed" });
  store.stale = true;
  const conflict = await store.claim({ order: order(), action: "auto_cancel", claimToken: "other", expectedCreatorUserId: null });
  assert.equal(conflict.claimed, false);
  assert.equal(store.token, "fixed");
});

test("execution開始とverifyでtokenを変更しない", async () => {
  const store = new MemoryStore();
  await store.claim({ order: order(), action: "accept", claimToken: "fixed", expectedCreatorUserId: "creator-user" });
  await store.startExecution({ order: order(), action: "accept", claimToken: "fixed" });
  await store.verifyExecution({ order: order(), action: "accept", claimToken: "fixed" });
  assert.equal(store.token, "fixed");
});

for (const action of ["accept", "decline", "auto_cancel"] as const) {
  test(`${action} executingを同じtokenでreconcilerが復旧する`, async () => {
    const store = new MemoryStore();
    const g = gateway();
    const result = await run({ action, store, gateway: g.implementation, token: "fixed", resumeExecution: true });
    assert.equal(result.kind, action === "accept" ? "accepted" : "canceled");
    assert.equal(store.token, null);
  });
}

test("capture直前のfence失敗ではStripeを呼ばない", async () => {
  const store = new MemoryStore();
  store.verifyAllowed = false;
  const g = gateway();
  await rejectsCode(run({ store, gateway: g.implementation }), "execution_fenced");
  assert.equal(g.calls.capture, 0);
});

test("cancel直前のfence失敗ではStripeを呼ばない", async () => {
  const store = new MemoryStore();
  store.verifyAllowed = false;
  const g = gateway();
  await rejectsCode(run({ action: "decline", store, gateway: g.implementation }), "execution_fenced");
  assert.equal(g.calls.cancel, 0);
});

test("capture応答喪失後はretrieveでsucceededを検出してfinalizeする", async () => {
  const store = new MemoryStore();
  let status = "requires_capture";
  const g = gateway();
  g.implementation.retrieve = async () => intent(status);
  g.implementation.capture = async () => { status = "succeeded"; throw new Error("response lost"); };
  const result = await run({ store, gateway: g.implementation });
  assert.equal(result.kind, "accepted");
  assert.equal(store.acceptedFinalizations, 1);
});

test("cancel応答喪失後はretrieveでcanceledを検出してfinalizeする", async () => {
  const store = new MemoryStore();
  let status = "requires_capture";
  const g = gateway();
  g.implementation.retrieve = async () => intent(status);
  g.implementation.cancel = async () => { status = "canceled"; throw new Error("response lost"); };
  const result = await run({ action: "decline", store, gateway: g.implementation });
  assert.equal(result.kind, "canceled");
});

test("Stripe succeeded・DB finalize前停止は同じexecutionで修復する", async () => {
  const store = new MemoryStore();
  store.failFinalizeOnce = true;
  const g = gateway();
  await rejectsCode(run({ store, gateway: g.implementation, token: "fixed" }), "finalize_failed");
  const result = await run({ store, gateway: g.implementation, token: "fixed", resumeExecution: true });
  assert.equal(result.kind, "accepted");
  assert.equal(g.calls.capture, 1);
});

test("期限前claimでもDB execution開始が期限切れならcaptureしない", async () => {
  const store = new MemoryStore();
  store.startReason = "deadline_expired";
  const g = gateway();
  await rejectsCode(run({ store, gateway: g.implementation }), "deadline_expired");
  assert.equal(g.calls.retrieve, 0);
  assert.equal(g.calls.capture, 0);
});

test("deadlineちょうどのfresh acceptを拒否する", async () => {
  const g = gateway();
  await rejectsCode(run({ now: atDeadline, gateway: g.implementation }), "deadline_expired");
  assert.equal(g.calls.retrieve, 0);
});

test("期限内にexecuting済みacceptは期限後も同じtokenで復旧できる", async () => {
  const store = new MemoryStore();
  const result = await run({ store, token: "fixed", resumeExecution: true, now: atDeadline });
  assert.equal(result.kind, "accepted");
});

test("processingはterminalにせずexecutingを維持する", async () => {
  const store = new MemoryStore();
  const result = await run({ store, gateway: gateway("processing").implementation });
  assert.equal(result.kind, "processing");
  assert.equal(store.state, "executing");
  assert.equal(store.acceptedFinalizations + store.canceledFinalizations, 0);
});

test("decline中のsucceeded検出はacceptedへ修復する", async () => {
  const result = await run({ action: "decline", gateway: gateway("succeeded").implementation });
  assert.equal(result.kind, "accepted");
});

test("auto-cancel中のsucceeded検出もacceptedへ修復する", async () => {
  const result = await run({ action: "auto_cancel", gateway: gateway("succeeded").implementation });
  assert.equal(result.kind, "accepted");
});

test("canceledはdecline/auto-cancelの正しい取消actionへ修復する", async () => {
  const declined = await run({ action: "decline", gateway: gateway("canceled").implementation });
  const expired = await run({ action: "auto_cancel", gateway: gateway("canceled").implementation });
  assert.equal(declined.kind === "canceled" && declined.action, "decline");
  assert.equal(expired.kind === "canceled" && expired.action, "auto_cancel");
});

test("terminal finalizeはstate/action/token不一致を成功扱いしない", async () => {
  const store = new MemoryStore();
  store.failFinalizeOnce = true;
  await rejectsCode(run({ store }), "finalize_failed");
  store.action = "decline";
  assert.equal(await store.finalizeAccepted({ order: order(), action: "accept", claimToken: "claim-token", stripeStatus: "succeeded", nowIso: new Date().toISOString() }), false);
});

test("金額・通貨・PI・Company・Creator改ざんを拒否する", async () => {
  for (const badIntent of [
    { ...intent(), amount: 999 },
    { ...intent(), currency: "usd" },
    { ...intent(), id: "pi_other" },
    { ...intent(), metadata: { b_user_id: "other", creator_user_id: "creator-user" } },
    { ...intent(), metadata: { b_user_id: "company-user", creator_user_id: "other" } },
  ]) {
    await rejectsCode(run({ gateway: { retrieve: async () => badIntent, capture: async () => badIntent, cancel: async () => badIntent } }), "payment_intent_mismatch");
  }
});

test("通常注文とTrendre Link注文の両方を処理できる", async () => {
  assert.equal((await run({ value: order() })).kind, "accepted");
  assert.equal((await run({ value: linkOrder() })).kind, "accepted");
});

test("通常注文は一致するorder_idだけを許可する", async () => {
  assert.equal((await run({ value: order() })).kind, "accepted");

  const invalidMetadata: Record<string, string>[] = [
    { b_user_id: "company-user", creator_user_id: "creator-user" },
    { order_id: "other-order", b_user_id: "company-user", creator_user_id: "creator-user" },
    {
      order_id: orderId,
      source: "trendre_link_quote",
      trendre_link_quote_id: "quote-id",
      trendre_link_inquiry_id: "inquiry-id",
      b_user_id: "company-user",
      creator_user_id: "creator-user",
    },
  ];
  for (const metadata of invalidMetadata) {
    const g = fixedGateway({ ...intent(), metadata });
    await rejectsCode(run({ value: order(), gateway: g.implementation }), "payment_intent_mismatch");
    assert.equal(g.calls.capture + g.calls.cancel, 0);
  }
});

test("Link注文はsource・quote・inquiry一致だけを許可する", async () => {
  assert.equal((await run({ value: linkOrder() })).kind, "accepted");

  const invalidMetadata: Record<string, string>[] = [
    { b_user_id: "company-user", creator_user_id: "creator-user" },
    { ...linkIntent().metadata, source: "other_source" },
    { ...linkIntent().metadata, trendre_link_quote_id: "other-quote" },
    { ...linkIntent().metadata, trendre_link_inquiry_id: "other-inquiry" },
    { ...linkIntent().metadata, order_id: orderId },
  ];
  for (const metadata of invalidMetadata) {
    const g = fixedGateway({ ...linkIntent(), metadata });
    await rejectsCode(run({ value: linkOrder(), gateway: g.implementation }), "payment_intent_mismatch");
    assert.equal(g.calls.capture + g.calls.cancel, 0);
  }
});

test("metadata不一致はHTTP相当fresh経路とreconciler相当resume経路の双方でStripe mutation前に拒否する", async () => {
  for (const resumeExecution of [false, true]) {
    for (const action of ["accept", "decline"] as const) {
      const bad = { ...intent(), metadata: { ...intent().metadata, order_id: "other-order" } };
      const g = fixedGateway(bad);
      await rejectsCode(run({ action, resumeExecution, gateway: g.implementation }), "payment_intent_mismatch");
      assert.equal(g.calls.capture, 0);
      assert.equal(g.calls.cancel, 0);
    }
  }
});

for (const workType of ["executing", "auto_cancel", "effects"] as const) {
  test(`${workType}は複数batchで101件目以降へ到達する`, async () => {
    const queue = Array.from({ length: 105 }, (_, index) =>
      `${workType}-${String(index).padStart(3, "0")}`
    );
    const processed: string[] = [];
    const result = await processClaimedWorkBatches({
      batchSize: 25,
      maxBatches: 5,
      claimBatch: async (size) => queue.splice(0, size),
      processItem: async (id) => { processed.push(id); },
      onItemError: () => undefined,
    });
    assert.equal(result.claimedCount, 105);
    assert.equal(processed.at(-1), `${workType}-104`);
  });
}

test("永続失敗とprocessing相当の先行行が後続workを塞がない", async () => {
  const queue = Array.from({ length: 110 }, (_, index) => index);
  const attempted: number[] = [];
  const failed: number[] = [];
  await processClaimedWorkBatches({
    batchSize: 25,
    maxBatches: 5,
    claimBatch: async (size) => queue.splice(0, size),
    processItem: async (id) => {
      attempted.push(id);
      if (id === 0) throw new Error("permanent");
    },
    onItemError: (id) => { failed.push(id); },
  });
  assert.deepEqual(failed, [0]);
  assert.equal(attempted.includes(109), true);
});

test("上限到達後は次回Cronが未処理分から継続する", async () => {
  const queue = Array.from({ length: 105 }, (_, index) => index);
  const processed: number[] = [];
  const executeCron = (maxBatches: number) => processClaimedWorkBatches({
    batchSize: 25,
    maxBatches,
    claimBatch: async (size) => queue.splice(0, size),
    processItem: async (id) => { processed.push(id); },
    onItemError: () => undefined,
  });
  assert.equal((await executeCron(2)).claimedCount, 50);
  assert.equal(queue.length, 55);
  assert.equal((await executeCron(5)).claimedCount, 55);
  assert.deepEqual(processed, Array.from({ length: 105 }, (_, index) => index));
});

test("原子的batch claimを模した同時workerは同じ注文を二重取得しない", async () => {
  const queue = Array.from({ length: 120 }, (_, index) => index);
  const claimed = new Set<number>();
  const duplicates: number[] = [];
  const worker = () => processClaimedWorkBatches({
    batchSize: 25,
    maxBatches: 3,
    claimBatch: async (size) => queue.splice(0, size),
    processItem: async (id) => {
      if (claimed.has(id)) duplicates.push(id);
      claimed.add(id);
    },
    onItemError: () => undefined,
  });
  await Promise.all([worker(), worker()]);
  assert.deepEqual(duplicates, []);
  assert.equal(claimed.size, 120);
});

test("Creator本人以外をRoute前段で拒否できる", () => {
  assert.equal(isOrderCreator({ creator_user_id: "creator-user" }, "creator-user"), true);
  assert.equal(isOrderCreator({ creator_user_id: "creator-user" }, "company-user"), false);
});

test("idempotency keyはactionと注文に対して安定する", () => {
  assert.equal(orderCaptureIdempotencyKey(orderId, "pi_order"), orderCaptureIdempotencyKey(orderId, "pi_order"));
  assert.equal(orderCancelIdempotencyKey(orderId, "pi_order", "decline"), orderCancelIdempotencyKey(orderId, "pi_order", "decline"));
  assert.equal(orderPaymentActionEventDedupeKey(orderId, "accept"), orderPaymentActionEventDedupeKey(orderId, "accept"));
});

test("accepted副作用はevent→chat→完了の順で、event失敗時は完了しない", async () => {
  const calls: string[] = [];
  await assert.rejects(completePaymentActionSideEffects({
    plan: paymentActionEffectPlan({ kind: "accepted", action: "accept" }),
    ensureTerminalEvent: async () => { calls.push("event"); throw new Error("event"); },
    ensureChat: async () => { calls.push("chat"); },
    markComplete: async () => { calls.push("complete"); },
  }), /event/);
  assert.deepEqual(calls, ["event"]);
});

test("chat失敗後は完了せず、次回にevent/chatを冪等補完できる", async () => {
  const calls: string[] = [];
  let failChat = true;
  const execute = () => completePaymentActionSideEffects({
    plan: paymentActionEffectPlan({ kind: "accepted", action: "accept" }),
    ensureTerminalEvent: async () => { calls.push("event"); },
    ensureChat: async () => { calls.push("chat"); if (failChat) throw new Error("chat"); },
    markComplete: async () => { calls.push("complete"); },
  });
  await assert.rejects(execute(), /chat/);
  failChat = false;
  await execute();
  assert.deepEqual(calls, ["event", "chat", "event", "chat", "complete"]);
});

test("完了時刻更新失敗後の再試行でも成功済みevent/chatを重複作成しない", async () => {
  const events = new Set<string>();
  const chats = new Set<string>();
  let failComplete = true;
  const execute = () => completePaymentActionSideEffects({
    plan: paymentActionEffectPlan({ kind: "accepted", action: "accept" }),
    ensureTerminalEvent: async () => { events.add(`event/${orderId}/accept`); },
    ensureChat: async () => { chats.add(`chat/${orderId}`); },
    markComplete: async () => {
      if (failComplete) throw new Error("complete");
    },
  });
  await assert.rejects(execute(), /complete/);
  failComplete = false;
  await execute();
  assert.equal(events.size, 1);
  assert.equal(chats.size, 1);
});

test("canceled副作用はchatを作らず完了できる", async () => {
  const calls: string[] = [];
  await completePaymentActionSideEffects({
    plan: paymentActionEffectPlan({ kind: "canceled", action: "decline" }),
    ensureTerminalEvent: async () => { calls.push("event"); },
    ensureChat: async () => { calls.push("chat"); },
    markComplete: async () => { calls.push("complete"); },
  });
  assert.deepEqual(calls, ["event", "complete"]);
});

test("SQLは2段階CAS・DB期限・fencing・finalize・権限・drift検査を定義する", () => {
  const sql = readFileSync("docs/sql/trendre-link-quote-checkout.sql", "utf8");
  for (const required of [
    "payment_action_state = 'claimed'",
    "payment_action_state = 'executing'",
    "clock_timestamp() < o.creator_accept_deadline",
    "start_order_payment_action_execution",
    "verify_order_payment_action_execution",
    "clear_stale_order_payment_action_claims",
    "claim_order_payment_action_work",
    "finalize_order_payment_action",
    "o.payment_action_state = 'executing'",
    "o.payment_action_type = p_action",
    "o.payment_action_token = p_claim_token",
    "from public, anon, authenticated",
    "to service_role",
    "assert_payment_action_rpc",
    "for update of o skip locked",
    "order by previous_attempt_at asc nulls first, anchor_at asc nulls first, o.id asc",
    "payment_action_reconcile_attempted_at",
    "payment_action_effects_attempted_at",
    "payment_action_auto_cancel_attempted_at",
    "p_batch_size is null or p_batch_size < 1 or p_batch_size > 100",
    "p_retry_after_seconds is null",
  ]) assert.equal(sql.includes(required), true, required);
});

test("admin/cron routeは認証後だけreconcilerを実行する", () => {
  const route = readFileSync("app/api/admin/orders/auto-cancel-unaccepted/route.ts", "utf8");
  assert.match(route, /authenticateAdminOrCron\(request\)/);
  assert.match(route, /if \(!auth\.ok\)/);
  assert.match(route, /reconcileAndAutoCancelOrders\(auth\.actorUserId\)/);
  assert.match(route, /export async function GET\(request: NextRequest\)/);
  assert.match(route, /return handleReconcileRequest\(request\)/);
  assert.match(route, /claimOrderPaymentActionWorkBatch/);
  assert.match(route, /processClaimedWorkBatches/);
  assert.doesNotMatch(route, /\.limit\(100\)/);
});
