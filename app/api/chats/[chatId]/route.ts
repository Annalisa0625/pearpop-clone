//app/api/chats/[chatId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
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
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // chat取得
  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", params.chatId)
    .single();

  if (!chat) {
    return NextResponse.json({ message: "Chat not found" }, { status: 404 });
  }

  // 自分が参加者か確認
  if (
    chat.creator_user_id !== user.id &&
    chat.company_user_id !== user.id
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // メッセージ取得
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ chat, messages });
}