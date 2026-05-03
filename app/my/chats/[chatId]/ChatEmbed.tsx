// app/my/chats/[chatId]/ChatEmbed.tsx
"use client";

import ChatClient from "./ChatClient";

export default function ChatEmbed({ chatId }: { chatId: string }) {
  return <ChatClient chatId={chatId} />;
}
