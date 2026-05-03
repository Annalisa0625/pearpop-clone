// File: app/api/messages/send/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_REQUEST_STATUSES = new Set(["accepted", "completed_by_creator"]);

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1) 認証
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    // 2) 入力
    const body = (await req.json().catch(() => null)) as
      | { chatId?: unknown; content?: unknown }
      | null;

    const chatId = typeof body?.chatId === "string" ? body.chatId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!chatId)
      return NextResponse.json({ error: "chatId が不正です。" }, { status: 400 });
    if (!content)
      return NextResponse.json({ error: "メッセージ内容は必須です。" }, { status: 400 });
    if (content.length > 2000)
      return NextResponse.json(
        { error: "メッセージが長すぎます（2000文字まで）。" },
        { status: 400 }
      );

    // 3) chat取得（🔥 修正箇所）
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("id, creator_user_id, company_user_id, request_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatErr)
      return NextResponse.json({ error: chatErr.message }, { status: 500 });
    if (!chat)
      return NextResponse.json({ error: "チャットが見つかりません。" }, { status: 404 });

    // 🔥 正しい参加者判定
    const isParticipant =
      chat.creator_user_id === user.id ||
      chat.company_user_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
    }

    // 4) request.status チェック
    const { data: reqRow, error: reqErr } = await supabase
      .from("requests")
      .select("id, status")
      .eq("id", chat.request_id)
      .maybeSingle();

    if (reqErr)
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    if (!reqRow)
      return NextResponse.json(
        { error: "紐づく依頼が見つかりません。" },
        { status: 404 }
      );

    const status = reqRow.status ?? "";
    if (!ALLOWED_REQUEST_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `この依頼ステータスでは送信できません (status=${status})` },
        { status: 403 }
      );
    }

    // 5) insert
    const { data: created, error: insErr } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      })
      .select("id, chat_id, sender_id, content, created_at")
      .maybeSingle();

    if (insErr) {
      console.error("messages insert error:", insErr);
      return NextResponse.json({ error: "送信に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: created ?? null });
  } catch (e) {
    console.error("Send Message Error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}