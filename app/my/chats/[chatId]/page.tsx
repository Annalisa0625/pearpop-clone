// app/my/chats/[chatId]/page.tsx
import ChatClient from "./ChatClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>ログインが必要です</div>;
  }

  return <ChatClient chatId={chatId} userId={user.id} />;
}