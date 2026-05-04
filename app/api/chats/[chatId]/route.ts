// File: app/api/chats/[chatId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await context.params;

    if (!chatId) {
      return NextResponse.json(
        { message: "chatId がありません" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (chatError) {
      console.error("chat load error:", chatError);
      return NextResponse.json(
        { message: "チャット情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const canAccess =
      chat.creator_user_id === user.id || chat.company_user_id === user.id;

    if (!canAccess) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("messages load error:", messagesError);
      return NextResponse.json(
        { message: "メッセージの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      chat,
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("GET chat route error:", error);

    return NextResponse.json(
      { message: "チャットの取得に失敗しました" },
      { status: 500 }
    );
  }
}