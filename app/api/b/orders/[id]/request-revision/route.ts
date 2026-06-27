// File: app/api/b/orders/[id]/request-revision/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildLineMessage,
  sendLineTextToUserId,
} from "@/lib/notifications/line";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  b_user_id: string;
  creator_id: string | null;
  creator_user_id: string;
  status: string;
  payment_status: string;
  delivered_post_url: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  completed_at: string | null;
  product_name: string | null;
  menu_title_snapshot: string | null;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function getOrderTitle(order: Pick<OrderRow, "product_name" | "menu_title_snapshot">) {
  const productName = order.product_name?.trim();
  const menuTitle = order.menu_title_snapshot?.trim();

  return productName || menuTitle || "注文";
}

function buildPreview(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

async function safeSendRevisionRequestedLineNotification(args: {
  order: OrderRow;
  revisionNote: string;
}) {
  try {
    if (!args.order.creator_user_id) {
      return;
    }

    const message = buildLineMessage({
      title: "修正依頼が届きました",
      body: [
        "納品内容について、依頼元から修正依頼が届きました。",
        "",
        `案件：${getOrderTitle(args.order)}`,
        `修正内容：${buildPreview(args.revisionNote)}`,
        "",
        "内容を確認して、修正版を提出してください。",
      ].join("\n"),
      linkPath: `/creator/orders/${args.order.id}`,
    });

    const result = await sendLineTextToUserId(args.order.creator_user_id, message, {
      notificationType: "order_revision_requested",
      creatorId: args.order.creator_id,
      entityType: "order",
      entityId: args.order.id,
    });

    if (!result?.ok) {
      console.warn("revision requested LINE notification not sent:", {
        orderId: args.order.id,
        creatorUserId: args.order.creator_user_id,
        skipped: result?.skipped ?? false,
        error: result?.error ?? null,
      });
    }
  } catch (error) {
    console.warn("revision requested LINE notification skipped:", error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json(
        { error: "注文IDがありません。" },
        { status: 400 }
      );
    }

    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "ログイン情報を取得できませんでした。" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "ログイン情報を取得できませんでした。" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const revisionNote = String(
      body?.revision_note ?? body?.note ?? ""
    ).trim();

    if (revisionNote.length < 10) {
      return NextResponse.json(
        { error: "修正依頼内容は10文字以上で入力してください。" },
        { status: 400 }
      );
    }

    if (revisionNote.length > 2000) {
      return NextResponse.json(
        { error: "修正依頼内容は2000文字以内で入力してください。" },
        { status: 400 }
      );
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        delivered_post_url,
        revision_count,
        max_revision_count,
        completed_at,
        product_name,
        menu_title_snapshot
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("request revision order load error:", orderError);
      return NextResponse.json(
        { error: "注文情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    const order = (orderData as OrderRow | null) ?? null;

    if (!order || order.b_user_id !== user.id) {
      return NextResponse.json(
        { error: "注文が見つかりません。" },
        { status: 404 }
      );
    }

    if (order.completed_at || order.status === "completed") {
      return NextResponse.json(
        {
          error:
            "この注文はすでに完了しています。完了後は原則として修正依頼できません。",
        },
        { status: 400 }
      );
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        {
          error:
            "修正依頼は、クリエイターが納品URLを提出した後のみ行えます。",
        },
        { status: 400 }
      );
    }

    if (order.payment_status !== "captured") {
      return NextResponse.json(
        {
          error:
            "決済が確定していない注文には修正依頼できません。",
        },
        { status: 400 }
      );
    }

    if (!order.delivered_post_url) {
      return NextResponse.json(
        {
          error:
            "納品URLが提出されていないため、修正依頼できません。",
        },
        { status: 400 }
      );
    }

    const currentRevisionCount = Number(order.revision_count ?? 0);
    const maxRevisionCount = Number(order.max_revision_count ?? 1);

    if (currentRevisionCount >= maxRevisionCount) {
      return NextResponse.json(
        {
          error:
            "修正依頼の上限回数に達しています。追加修正が必要な場合はチャットで相談するか、新規注文として依頼してください。",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "revision_requested",
        revision_requested_at: now,
        revision_note: revisionNote,
        revision_count: currentRevisionCount + 1,
        auto_complete_at: null,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("b_user_id", user.id)
      .select(
        `
        id,
        status,
        payment_status,
        revision_requested_at,
        revision_note,
        revision_count,
        max_revision_count,
        updated_at
      `
      )
      .single();

    if (updateError) {
      console.error("request revision update error:", updateError);
      return NextResponse.json(
        { error: "修正依頼の送信に失敗しました。" },
        { status: 500 }
      );
    }

    await safeSendRevisionRequestedLineNotification({
      order,
      revisionNote,
    });

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("request revision api error:", error);

    return NextResponse.json(
      { error: "修正依頼の送信に失敗しました。" },
      { status: 500 }
    );
  }
}
