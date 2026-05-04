// File: app/api/chats/[chatId]/messages/route.ts

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await context.params;

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId がありません" },
        { status: 400 }
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id, company_user_id, creator_user_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatError) {
      console.error("chat load error:", chatError);
      return NextResponse.json(
        { error: "チャット情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!chat) {
      return NextResponse.json(
        { error: "チャットが見つかりません" },
        { status: 404 }
      );
    }

    const canAccess =
      chat.company_user_id === user.id || chat.creator_user_id === user.id;

    if (!canAccess) {
      return NextResponse.json(
        { error: "このチャットを見る権限がありません" },
        { status: 403 }
      );
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("id, chat_id, sender_user_id, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("messages load error:", messagesError);
      return NextResponse.json(
        { error: "メッセージの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("GET chat messages error:", error);
    return NextResponse.json(
      { error: "メッセージの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await context.params;

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId がありません" },
        { status: 400 }
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "メッセージは2000文字以内で入力してください" },
        { status: 400 }
      );
    }

    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id, company_user_id, creator_user_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatError) {
      console.error("chat load error:", chatError);
      return NextResponse.json(
        { error: "チャット情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!chat) {
      return NextResponse.json(
        { error: "チャットが見つかりません" },
        { status: 404 }
      );
    }

    const canSend =
      chat.company_user_id === user.id || chat.creator_user_id === user.id;

    if (!canSend) {
      return NextResponse.json(
        { error: "このチャットに送信する権限がありません" },
        { status: 403 }
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_user_id: user.id,
        content,
      })
      .select("id, chat_id, sender_user_id, content, created_at")
      .single();

    if (insertError) {
      console.error("message insert error:", insertError);
      return NextResponse.json(
        { error: "メッセージの送信に失敗しました" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const { error: chatUpdateError } = await supabaseAdmin
      .from("chats")
      .update({
        last_message_at: now,
      })
      .eq("id", chatId);

    if (chatUpdateError) {
      console.error("chat last_message_at update error:", chatUpdateError);
    }

    await supabaseAdmin.from("chat_reads").upsert(
      {
        chat_id: chatId,
        user_id: user.id,
        last_read_at: now,
        updated_at: now,
      },
      {
        onConflict: "chat_id,user_id",
      }
    );

    return NextResponse.json({
      message: inserted,
    });
  } catch (error) {
    console.error("POST chat messages error:", error);
    return NextResponse.json(
      { error: "メッセージの送信に失敗しました" },
      { status: 500 }
    );
  }
}