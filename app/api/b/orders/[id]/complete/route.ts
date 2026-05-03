// File: app/api/b/orders/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await context.params;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_user_id,
        status,
        payment_status,
        delivered_post_url,
        completed_at
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    if (order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を完了する権限がありません" },
        { status: 403 }
      );
    }

    if (order.status === "completed") {
      return NextResponse.json({
        ok: true,
        order_id: order.id,
        status: "completed",
        completed_at: order.completed_at,
      });
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "この注文は現在完了できません" },
        { status: 409 }
      );
    }

    if (order.payment_status !== "captured") {
      return NextResponse.json(
        { error: "決済確定済みの注文のみ完了できます" },
        { status: 409 }
      );
    }

    if (!order.delivered_post_url) {
      return NextResponse.json(
        { error: "納品URLが未提出です" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "company_completed_order",
      event_data: {
        delivered_post_url: order.delivered_post_url,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "completed",
      completed_at: nowIso,
    });
  } catch (error) {
    console.error("company order complete error", error);

    return NextResponse.json(
      { error: "注文の完了処理に失敗しました" },
      { status: 500 }
    );
  }
}