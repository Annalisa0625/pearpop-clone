// File: app/api/orders/[id]/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  canCreateOrderChatForOrder,
  isOrderChatParticipant,
} from "@/lib/orders/order-chat";
import {
  createOrderChatForOrder,
  getOrderChatForOrder,
} from "@/lib/orders/order-chat-server";

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

export async function GET(
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
        "id, b_user_id, creator_user_id, creator_menu_id, status, payment_status, accepted_at"
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

    if (!isOrderChatParticipant(order, user.id)) {
      return NextResponse.json(
        { error: "この注文のチャットを見る権限がありません" },
        { status: 403 }
      );
    }

    const existingChat = await getOrderChatForOrder(order);
    if (existingChat) {
      return NextResponse.json({ ok: true, chat: existingChat });
    }

    if (!canCreateOrderChatForOrder(order)) {
      return NextResponse.json(
        {
          error: "この注文ではまだチャットを開始できません",
          error_code: "order_chat_not_available",
        },
        { status: 409 }
      );
    }

    const { chat, created } = await createOrderChatForOrder(order);

    if (created) {
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        actor_user_id: user.id,
        event_type: "order_chat_created",
        event_data: { chat_id: chat.id },
      });
    }

    return NextResponse.json({
      ok: true,
      chat,
    });
  } catch (error) {
    console.error("order chat get/create error", error);

    return NextResponse.json(
      { error: "注文チャットの取得に失敗しました" },
      { status: 500 }
    );
  }
}
