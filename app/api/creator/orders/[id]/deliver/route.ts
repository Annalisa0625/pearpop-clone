// File: app/api/creator/orders/[id]/deliver/route.ts
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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

    const body = await req.json().catch(() => null);
    const deliveredPostUrl =
      typeof body?.delivered_post_url === "string"
        ? body.delivered_post_url.trim()
        : "";

    if (!deliveredPostUrl) {
      return NextResponse.json(
        { error: "納品URLを入力してください" },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(deliveredPostUrl)) {
      return NextResponse.json(
        { error: "納品URLは http:// または https:// で始まるURLにしてください" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        creator_user_id,
        status,
        payment_status,
        delivered_post_url
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

    if (order.creator_user_id !== user.id) {
      return NextResponse.json(
        { error: "この注文を納品する権限がありません" },
        { status: 403 }
      );
    }

    const deliverableStatuses = [
      "accepted_captured",
      "in_progress",
      "delivered",
      "revision_requested",
    ];

    if (!deliverableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "この注文は現在納品できません" },
        { status: 409 }
      );
    }

    if (order.payment_status !== "captured") {
      return NextResponse.json(
        { error: "決済確定後に納品できます" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const autoCompleteAtIso = new Date(
      Date.now() + 72 * 60 * 60 * 1000
    ).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "delivered",
        delivered_post_url: deliveredPostUrl,
        delivered_at: nowIso,
        auto_complete_at: autoCompleteAtIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type:
        order.status === "delivered"
          ? "creator_updated_delivery_url"
          : "creator_delivered_order",
      event_data: {
        delivered_post_url: deliveredPostUrl,
        previous_delivered_post_url: order.delivered_post_url,
        previous_status: order.status,
        was_revision_delivery: order.status === "revision_requested",
        auto_complete_at: autoCompleteAtIso,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "delivered",
      delivered_post_url: deliveredPostUrl,
      delivered_at: nowIso,
      auto_complete_at: autoCompleteAtIso,
    });
  } catch (error) {
    console.error("creator order deliver error", error);

    return NextResponse.json(
      { error: "納品処理に失敗しました" },
      { status: 500 }
    );
  }
}