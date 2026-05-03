// File: app/api/orders/[id]/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChatRow = {
  id: string;
  request_id: string | null;
  order_id: string | null;
  company_user_id: string;
  creator_user_id: string;
  created_at: string;
  last_message_at: string | null;
};

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
      .select("id, b_user_id, creator_user_id, status")
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

    const isParticipant =
      order.b_user_id === user.id || order.creator_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "この注文のチャットを見る権限がありません" },
        { status: 403 }
      );
    }

    const chatSelect =
      "id, request_id, order_id, company_user_id, creator_user_id, created_at, last_message_at";

    const { data: existingChat, error: existingChatError } =
      await supabaseAdmin
        .from("chats")
        .select(chatSelect)
        .eq("order_id", order.id)
        .maybeSingle();

    if (existingChatError) {
      throw existingChatError;
    }

    if (existingChat) {
      return NextResponse.json({
        ok: true,
        chat: existingChat as ChatRow,
      });
    }

    const { data: createdChat, error: createError } = await supabaseAdmin
      .from("chats")
      .insert({
        request_id: null,
        order_id: order.id,
        company_user_id: order.b_user_id,
        creator_user_id: order.creator_user_id,
        last_message_at: null,
      })
      .select(chatSelect)
      .single();

    if (createError) {
      const isDuplicate = createError.code === "23505";

      if (isDuplicate) {
        const { data: retryChat, error: retryError } = await supabaseAdmin
          .from("chats")
          .select(chatSelect)
          .eq("order_id", order.id)
          .maybeSingle();

        if (retryError) {
          throw retryError;
        }

        if (retryChat) {
          return NextResponse.json({
            ok: true,
            chat: retryChat as ChatRow,
          });
        }
      }

      throw createError;
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      actor_user_id: user.id,
      event_type: "order_chat_created",
      event_data: {},
    });

    return NextResponse.json({
      ok: true,
      chat: createdChat as ChatRow,
    });
  } catch (error) {
    console.error("order chat get/create error", error);

    return NextResponse.json(
      { error: "注文チャットの取得に失敗しました" },
      { status: 500 }
    );
  }
}