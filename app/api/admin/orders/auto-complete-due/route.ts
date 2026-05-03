// File: app/api/admin/orders/auto-complete-due/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DueOrderRow = {
  id: string;
  b_user_id: string;
  creator_user_id: string;
  status: string;
  payment_status: string;
  delivered_post_url: string | null;
  delivered_at: string | null;
  auto_complete_at: string | null;
  completed_at: string | null;
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

async function authenticateAdminOrCron(request: NextRequest): Promise<AuthResult> {
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
    console.error("auto complete admin role check error:", roleError);

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

async function autoCompleteDueOrders(actorUserId: string | null) {
  const nowIso = new Date().toISOString();

  const { data: dueOrders, error: loadError } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      b_user_id,
      creator_user_id,
      status,
      payment_status,
      delivered_post_url,
      delivered_at,
      auto_complete_at,
      completed_at
    `
    )
    .eq("status", "delivered")
    .eq("payment_status", "captured")
    .is("completed_at", null)
    .not("delivered_post_url", "is", null)
    .not("auto_complete_at", "is", null)
    .lte("auto_complete_at", nowIso);

  if (loadError) {
    throw loadError;
  }

  const orders = (dueOrders ?? []) as DueOrderRow[];

  if (orders.length === 0) {
    return {
      scannedAt: nowIso,
      completedCount: 0,
      completedOrderIds: [] as string[],
      skippedOrderIds: [] as string[],
    };
  }

  const completedOrderIds: string[] = [];
  const skippedOrderIds: string[] = [];

  for (const order of orders) {
    const completedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        completed_at: completedAt,
        completed_reason: "auto_after_72h",
        updated_at: completedAt,
      })
      .eq("id", order.id)
      .eq("status", "delivered")
      .eq("payment_status", "captured")
      .is("completed_at", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("auto complete order update error:", {
        orderId: order.id,
        updateError,
      });

      skippedOrderIds.push(order.id);
      continue;
    }

    if (!updated?.id) {
      skippedOrderIds.push(order.id);
      continue;
    }

    completedOrderIds.push(updated.id);

    const { error: eventError } = await supabaseAdmin
      .from("order_events")
      .insert({
        order_id: order.id,
        actor_user_id: actorUserId,
        event_type: "order_auto_completed_after_72h",
        event_data: {
          delivered_at: order.delivered_at,
          auto_complete_at: order.auto_complete_at,
          delivered_post_url: order.delivered_post_url,
        },
      });

    if (eventError) {
      console.error("auto complete order event insert error:", {
        orderId: order.id,
        eventError,
      });
    }
  }

  return {
    scannedAt: nowIso,
    completedCount: completedOrderIds.length,
    completedOrderIds,
    skippedOrderIds,
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

    const result = await autoCompleteDueOrders(auth.actorUserId);

    return NextResponse.json({
      ok: true,
      authType: auth.authType,
      ...result,
    });
  } catch (error) {
    console.error("auto complete due orders error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "自動完了処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "admin orders auto-complete-due",
    auth: {
      adminBearer: true,
      cronSecret: !!process.env.CRON_SECRET,
    },
    message:
      "POST this route with Authorization: Bearer <admin access token> or Authorization: Bearer <CRON_SECRET> to auto-complete delivered orders whose auto_complete_at has passed.",
  });
}