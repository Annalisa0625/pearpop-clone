//app/api/chats/[chatId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const body = await req.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ message: "Content required" }, { status: 400 });
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
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", params.chatId)
    .single();

  if (!chat) {
    return NextResponse.json({ message: "Chat not found" }, { status: 404 });
  }

  if (
    chat.creator_user_id !== user.id &&
    chat.company_user_id !== user.id
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("messages").insert({
    chat_id: chat.id,
    sender_user_id: user.id,
    content,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "sent" });
}