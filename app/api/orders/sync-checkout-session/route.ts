// File: app/api/orders/sync-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const AUTH_TIMEOUT_MS = 8000;
const DB_TIMEOUT_MS = 10000;
const DB_OPTIONAL_TIMEOUT_MS = 3000;
const STRIPE_TIMEOUT_MS = 15000;

type ServerDeps = {
  supabaseAdmin: any;
  getStripe: () => any;
};

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function loadServerDeps(): Promise<ServerDeps> {
  const [supabaseModule, stripeModule] = await Promise.all([
    import("@/lib/supabaseAdmin"),
    import("@/lib/stripe"),
  ]);

  return {
    supabaseAdmin: (supabaseModule as any).supabaseAdmin,
    getStripe: (stripeModule as any).getStripe,
  };
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

async function getAuthenticatedUser(args: {
  supabaseAdmin: any;
  token: string;
}) {
  const authResult: any = await withTimeout(
    args.supabaseAdmin.auth.getUser(args.token),
    AUTH_TIMEOUT_MS,
    "認証情報の確認に時間がかかっています"
  );

  const user = authResult?.data?.user ?? null;
  const error = authResult?.error ?? null;

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

function getPaymentIntentFromSession(session: any) {
  const paymentIntent = session?.payment_intent;

  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return {
      id: paymentIntent,
      status: null as string | null,
    };
  }

  return {
    id: paymentIntent.id,
    status: paymentIntent.status ?? null,
  };
}

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function safeInsertOrderEvent(args: {
  supabaseAdmin: any;
  orderId: string;
  actorUserId: string | null;
  eventType: string;
  eventData: Record<string, unknown>;
}) {
  try {
    const eventRow = {
      order_id: args.orderId,
      actor_user_id: args.actorUserId,
      event_type: args.eventType,
      event_data: args.eventData,
    } as never;

    await withTimeout(
      args.supabaseAdmin.from("order_events").insert(eventRow),
      DB_OPTIONAL_TIMEOUT_MS,
      "order event insert timeout"
    );
  } catch (error) {
    console.warn("order event insert skipped", error);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/orders/sync-checkout-session",
    methods: ["POST"],
    message: "sync checkout session route is alive",
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  let deps: ServerDeps | null = null;
  let actorUserId: string | null = null;
  let orderIdForError: string | null = null;

  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { error: "認証トークンがありません" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Checkout session id がありません" },
        { status: 400 }
      );
    }

    deps = await loadServerDeps();

    const { supabaseAdmin, getStripe } = deps;

    const { user, error: authError } = await getAuthenticatedUser({
      supabaseAdmin,
      token,
    });

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    actorUserId = user.id;

    const stripe = getStripe();

    const session: any = await withTimeout(
      stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      }),
      STRIPE_TIMEOUT_MS,
      "Stripe Checkout Session の取得に時間がかかっています"
    );

    const orderId =
      session?.metadata?.order_id ||
      (typeof session?.client_reference_id === "string"
        ? session.client_reference_id
        : null);

    if (!orderId) {
      return NextResponse.json(
        { error: "注文IDを取得できませんでした" },
        { status: 400 }
      );
    }

    orderIdForError = orderId;

    const orderResult: any = await withTimeout(
      supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          b_user_id,
          status,
          payment_status,
          stripe_checkout_session_id,
          stripe_payment_intent_id
        `
        )
        .eq("id", orderId)
        .maybeSingle(),
      DB_TIMEOUT_MS,
      "注文情報の取得に時間がかかっています"
    );

    if (orderResult?.error) {
      throw orderResult.error;
    }

    const order = orderResult?.data ?? null;

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を確認する権限がありません" },
        { status: 403 }
      );
    }

    if (
      order.stripe_checkout_session_id &&
      order.stripe_checkout_session_id !== session.id
    ) {
      return NextResponse.json(
        { error: "Checkout session が注文と一致しません" },
        { status: 400 }
      );
    }

    const paymentIntentInfo = getPaymentIntentFromSession(session);

    if (!paymentIntentInfo?.id) {
      return NextResponse.json(
        { error: "PaymentIntent を取得できませんでした" },
        { status: 400 }
      );
    }

    let paymentIntentStatus = paymentIntentInfo.status;

    if (!paymentIntentStatus) {
      const paymentIntent: any = await withTimeout(
        stripe.paymentIntents.retrieve(paymentIntentInfo.id),
        STRIPE_TIMEOUT_MS,
        "Stripe PaymentIntent の取得に時間がかかっています"
      );

      paymentIntentStatus = paymentIntent?.status ?? null;
    }

    if (!paymentIntentStatus) {
      return NextResponse.json(
        { error: "PaymentIntent の状態を取得できませんでした" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    if (paymentIntentStatus === "requires_capture") {
      const shouldSetDeadline =
        order.status === "checkout_pending" ||
        order.payment_status === "checkout_pending";

      const creatorAcceptDeadline = shouldSetDeadline ? addHoursIso(72) : null;

      const patch: Record<string, string | null> = {
        status: "authorized_pending_creator",
        payment_status: "authorized",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentInfo.id,
        stripe_payment_status: paymentIntentStatus,
        authorized_at: nowIso,
        updated_at: nowIso,
      };

      if (creatorAcceptDeadline) {
        patch.creator_accept_deadline = creatorAcceptDeadline;
      }

      const updateResult: any = await withTimeout(
        supabaseAdmin.from("orders").update(patch as never).eq("id", order.id),
        DB_TIMEOUT_MS,
        "注文ステータスの更新に時間がかかっています"
      );

      if (updateResult?.error) {
        throw updateResult.error;
      }

      await safeInsertOrderEvent({
        supabaseAdmin,
        orderId: order.id,
        actorUserId: user.id,
        eventType: "stripe_authorized_requires_capture",
        eventData: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
          creator_accept_deadline: creatorAcceptDeadline,
          creator_accept_window_hours: 72,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "authorized_pending_creator",
        payment_status: "authorized",
        payment_intent_status: paymentIntentStatus,
        creator_accept_deadline: creatorAcceptDeadline,
      });
    }

    if (paymentIntentStatus === "succeeded") {
      const updateResult: any = await withTimeout(
        supabaseAdmin
          .from("orders")
          .update({
            status: "accepted_captured",
            payment_status: "captured",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentInfo.id,
            stripe_payment_status: paymentIntentStatus,
            captured_at: nowIso,
            updated_at: nowIso,
          } as never)
          .eq("id", order.id),
        DB_TIMEOUT_MS,
        "注文ステータスの更新に時間がかかっています"
      );

      if (updateResult?.error) {
        throw updateResult.error;
      }

      await safeInsertOrderEvent({
        supabaseAdmin,
        orderId: order.id,
        actorUserId: user.id,
        eventType: "stripe_payment_succeeded_unexpected",
        eventData: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "accepted_captured",
        payment_status: "captured",
        payment_intent_status: paymentIntentStatus,
      });
    }

    if (paymentIntentStatus === "canceled") {
      const updateResult: any = await withTimeout(
        supabaseAdmin
          .from("orders")
          .update({
            status: "declined_canceled",
            payment_status: "canceled",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentInfo.id,
            stripe_payment_status: paymentIntentStatus,
            canceled_at: nowIso,
            updated_at: nowIso,
          } as never)
          .eq("id", order.id),
        DB_TIMEOUT_MS,
        "注文ステータスの更新に時間がかかっています"
      );

      if (updateResult?.error) {
        throw updateResult.error;
      }

      await safeInsertOrderEvent({
        supabaseAdmin,
        orderId: order.id,
        actorUserId: user.id,
        eventType: "stripe_payment_intent_canceled",
        eventData: {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentInfo.id,
          stripe_payment_intent_status: paymentIntentStatus,
        },
      });

      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "declined_canceled",
        payment_status: "canceled",
        payment_intent_status: paymentIntentStatus,
      });
    }

    await safeInsertOrderEvent({
      supabaseAdmin,
      orderId: order.id,
      actorUserId: user.id,
      eventType: "stripe_checkout_synced_without_state_change",
      eventData: {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentInfo.id,
        stripe_payment_intent_status: paymentIntentStatus,
        checkout_payment_status: session.payment_status,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      payment_intent_status: paymentIntentStatus,
      message: "まだ注文状態は更新されていません",
    });
  } catch (error) {
    console.error("orders sync checkout session error", error);

    if (deps?.supabaseAdmin && orderIdForError) {
      await safeInsertOrderEvent({
        supabaseAdmin: deps.supabaseAdmin,
        orderId: orderIdForError,
        actorUserId,
        eventType: "orders_sync_checkout_session_error",
        eventData: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown sync checkout session error",
        },
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Checkout結果の同期に失敗しました",
      },
      { status: 500 }
    );
  }
}