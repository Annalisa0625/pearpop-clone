// File: app/api/admin/orders/transfer-due/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TransferDueOrderRow = {
  id: string;
  b_user_id: string;
  creator_id: string | null;
  creator_user_id: string;
  status: string;
  payment_status: string;
  currency: string | null;
  creator_payout_amount: number;
  stripe_transfer_id: string | null;
  transfer_status: string;
  completed_at: string | null;
};

type CreatorPayoutRow = {
  id: string;
  user_id: string;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
};

type AuthResult = {
  ok: boolean;
  actorUserId: string | null;
  authType: "admin" | "cron" | null;
  error?: string;
  status?: number;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function toStripeCurrency(value: string | null | undefined) {
  return (value || "JPY").toLowerCase();
}

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; raw?: { message?: unknown } };

    if (typeof maybeError.message === "string") return maybeError.message;
    if (typeof maybeError.raw?.message === "string") return maybeError.raw.message;
  }

  return "Unknown error";
}

async function authenticateAdminOrCron(
  request: NextRequest
): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "認証トークンがありません。",
      status: 401,
    };
  }

  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && token === cronSecret) {
    return {
      ok: true,
      actorUserId: null,
      authType: "cron",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "認証に失敗しました。",
      status: 401,
    };
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("transfer due admin role check error:", roleError);

    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "管理者権限の確認に失敗しました。",
      status: 500,
    };
  }

  if (!roleRow) {
    return {
      ok: false,
      actorUserId: null,
      authType: null,
      error: "管理者のみ実行できます。",
      status: 403,
    };
  }

  return {
    ok: true,
    actorUserId: user.id,
    authType: "admin",
  };
}

async function findCreatorForOrder(order: TransferDueOrderRow) {
  if (order.creator_id) {
    const { data, error } = await supabaseAdmin
      .from("creators")
      .select(
        `
        id,
        user_id,
        stripe_account_id,
        stripe_onboarding_completed
      `
      )
      .eq("id", order.creator_id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as CreatorPayoutRow;
  }

  const { data, error } = await supabaseAdmin
    .from("creators")
    .select(
      `
      id,
      user_id,
      stripe_account_id,
      stripe_onboarding_completed
    `
    )
    .eq("user_id", order.creator_user_id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CreatorPayoutRow | null;
}

async function markTransferNotReady(orderId: string, reason: string) {
  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("orders")
    .update({
      transfer_status: "not_started",
      transfer_attempted_at: nowIso,
      transfer_failed_reason: reason,
      updated_at: nowIso,
    })
    .eq("id", orderId);
}

async function markTransferFailed(orderId: string, reason: string) {
  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("orders")
    .update({
      transfer_status: "failed",
      transfer_attempted_at: nowIso,
      transfer_failed_reason: reason.slice(0, 1000),
      updated_at: nowIso,
    })
    .eq("id", orderId);
}

async function transferDueOrders(actorUserId: string | null) {
  const nowIso = new Date().toISOString();

  const { data: dueOrders, error: loadError } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      b_user_id,
      creator_id,
      creator_user_id,
      status,
      payment_status,
      currency,
      creator_payout_amount,
      stripe_transfer_id,
      transfer_status,
      completed_at
    `
    )
    .eq("status", "completed")
    .eq("payment_status", "captured")
    .is("stripe_transfer_id", null)
    .in("transfer_status", ["not_started", "failed"])
    .gt("creator_payout_amount", 0)
    .order("completed_at", { ascending: true })
    .limit(25);

  if (loadError) {
    throw loadError;
  }

  const orders = (dueOrders ?? []) as TransferDueOrderRow[];

  if (orders.length === 0) {
    return {
      scannedAt: nowIso,
      transferredCount: 0,
      transferredOrderIds: [] as string[],
      skippedOrderIds: [] as string[],
      failedOrderIds: [] as string[],
    };
  }

  const stripe = getStripe();

  const transferredOrderIds: string[] = [];
  const skippedOrderIds: string[] = [];
  const failedOrderIds: string[] = [];

  for (const order of orders) {
    const attemptedAt = new Date().toISOString();

    const { data: lockedOrder, error: lockError } = await supabaseAdmin
      .from("orders")
      .update({
        transfer_status: "pending",
        transfer_attempted_at: attemptedAt,
        transfer_failed_reason: null,
        updated_at: attemptedAt,
      })
      .eq("id", order.id)
      .eq("status", "completed")
      .eq("payment_status", "captured")
      .is("stripe_transfer_id", null)
      .in("transfer_status", ["not_started", "failed"])
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("transfer due lock error:", {
        orderId: order.id,
        lockError,
      });

      failedOrderIds.push(order.id);
      continue;
    }

    if (!lockedOrder?.id) {
      skippedOrderIds.push(order.id);
      continue;
    }

    try {
      const creator = await findCreatorForOrder(order);

      if (!creator) {
        await markTransferNotReady(
          order.id,
          "Creator record was not found for this order."
        );
        skippedOrderIds.push(order.id);
        continue;
      }

      if (!creator.stripe_account_id) {
        await markTransferNotReady(
          order.id,
          "Creator Stripe Connect account is not set."
        );
        skippedOrderIds.push(order.id);
        continue;
      }

      if (!creator.stripe_onboarding_completed) {
        await markTransferNotReady(
          order.id,
          "Creator Stripe Connect onboarding is not completed."
        );
        skippedOrderIds.push(order.id);
        continue;
      }

      const amount = Number(order.creator_payout_amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        await markTransferNotReady(
          order.id,
          "Creator payout amount must be greater than 0."
        );
        skippedOrderIds.push(order.id);
        continue;
      }

      const currency = toStripeCurrency(order.currency);
      const idempotencyKey = `trendre_order_transfer_${order.id}`;

      const transfer = await stripe.transfers.create(
        {
          amount,
          currency,
          destination: creator.stripe_account_id,
          description: `Trendre creator payout for order ${order.id}`,
          metadata: {
            app: "trendre",
            order_id: order.id,
            creator_id: creator.id,
            creator_user_id: creator.user_id,
            b_user_id: order.b_user_id,
          },
        },
        {
          idempotencyKey,
        }
      );

      const transferredAt = new Date().toISOString();

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          transfer_status: "transferred",
          stripe_transfer_id: transfer.id,
          transferred_at: transferredAt,
          transfer_failed_reason: null,
          updated_at: transferredAt,
        })
        .eq("id", order.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updated?.id) {
        throw new Error("Transfer succeeded but order update returned no row.");
      }

      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: actorUserId,
        event_type: "creator_payout_transferred",
        event_data: {
          stripe_transfer_id: transfer.id,
          stripe_destination_account_id: creator.stripe_account_id,
          amount,
          currency,
          idempotency_key: idempotencyKey,
        },
      });

      transferredOrderIds.push(order.id);
    } catch (error) {
      const message = errorToMessage(error);

      console.error("transfer due single order error:", {
        orderId: order.id,
        error,
      });

      await markTransferFailed(order.id, message);

      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: actorUserId,
        event_type: "creator_payout_transfer_failed",
        event_data: {
          error: message,
        },
      });

      failedOrderIds.push(order.id);
    }
  }

  return {
    scannedAt: nowIso,
    transferredCount: transferredOrderIds.length,
    transferredOrderIds,
    skippedOrderIds,
    failedOrderIds,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminOrCron(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: auth.error,
        },
        {
          status: auth.status ?? 401,
        }
      );
    }

    const result = await transferDueOrders(auth.actorUserId);

    return NextResponse.json({
      ok: true,
      authType: auth.authType,
      ...result,
    });
  } catch (error) {
    console.error("transfer due orders error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "クリエイター報酬の送金処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "admin orders transfer-due",
    auth: {
      adminBearer: true,
      cronSecret: !!process.env.CRON_SECRET,
    },
    message:
      "POST this route with Authorization: Bearer <admin access token> or Authorization: Bearer <CRON_SECRET> to transfer creator payouts for completed captured orders.",
  });
}