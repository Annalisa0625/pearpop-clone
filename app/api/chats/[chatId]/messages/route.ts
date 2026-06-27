// File: app/api/chats/[chatId]/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildLineMessage,
  sendLineTextToUserId,
} from "@/lib/notifications/line";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChatRow = {
  id: string;
  request_id: string | null;
  order_id: string | null;
  company_user_id: string;
  creator_user_id: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

type NotificationContext = {
  senderName: string;
  linkPath: string | null;
  entityType: "order" | "request" | "chat";
  entityId: string;
  creatorId: string | null;
  orderTitle: string | null;
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

function getRecipientUserId(chat: ChatRow, senderUserId: string) {
  if (chat.company_user_id === senderUserId) {
    return chat.creator_user_id;
  }

  if (chat.creator_user_id === senderUserId) {
    return chat.company_user_id;
  }

  return null;
}

function getRecipientLinkPath(chat: ChatRow, recipientUserId: string) {
  const isCreatorRecipient = recipientUserId === chat.creator_user_id;
  const isCompanyRecipient = recipientUserId === chat.company_user_id;

  if (chat.order_id) {
    if (isCreatorRecipient) return `/creator/orders/${chat.order_id}`;
    if (isCompanyRecipient) return `/b/orders/${chat.order_id}`;
  }

  if (chat.request_id) {
    if (isCreatorRecipient) return `/creator/requests/${chat.request_id}`;
    if (isCompanyRecipient) return `/b/requests/${chat.request_id}`;
  }

  return null;
}

function getEntityInfo(chat: ChatRow): {
  entityType: "order" | "request" | "chat";
  entityId: string;
} {
  if (chat.order_id) {
    return {
      entityType: "order",
      entityId: chat.order_id,
    };
  }

  if (chat.request_id) {
    return {
      entityType: "request",
      entityId: chat.request_id,
    };
  }

  return {
    entityType: "chat",
    entityId: chat.id,
  };
}

function buildMessagePreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 90) {
    return normalized;
  }

  return `${normalized.slice(0, 90)}...`;
}

async function getSenderDisplayName(args: {
  senderUserId: string;
  isCreatorSender: boolean;
}) {
  try {
    if (args.isCreatorSender) {
      const { data, error } = await supabaseAdmin
        .from("creators")
        .select("display_name")
        .eq("user_id", args.senderUserId)
        .maybeSingle();

      if (!error && data?.display_name) {
        return String(data.display_name);
      }

      return "クリエイター";
    }

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("company_name")
      .eq("user_id", args.senderUserId)
      .maybeSingle();

    if (!error && data?.company_name) {
      return String(data.company_name);
    }

    return "依頼元";
  } catch (error) {
    console.warn("sender display name lookup skipped:", error);
    return args.isCreatorSender ? "クリエイター" : "依頼元";
  }
}

async function getOrderNotificationFields(orderId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, creator_id, product_name, menu_title_snapshot")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn("order notification context lookup skipped:", error);
      return {
        creatorId: null,
        orderTitle: null,
      };
    }

    const productName =
      typeof data.product_name === "string" ? data.product_name.trim() : "";
    const menuTitle =
      typeof data.menu_title_snapshot === "string"
        ? data.menu_title_snapshot.trim()
        : "";

    return {
      creatorId: typeof data.creator_id === "string" ? data.creator_id : null,
      orderTitle: productName || menuTitle || null,
    };
  } catch (error) {
    console.warn("order notification context lookup skipped:", error);

    return {
      creatorId: null,
      orderTitle: null,
    };
  }
}

async function buildNotificationContext(args: {
  chat: ChatRow;
  senderUserId: string;
  recipientUserId: string;
}): Promise<NotificationContext> {
  const { entityType, entityId } = getEntityInfo(args.chat);
  const isCreatorSender = args.senderUserId === args.chat.creator_user_id;

  const [senderName, orderFields] = await Promise.all([
    getSenderDisplayName({
      senderUserId: args.senderUserId,
      isCreatorSender,
    }),
    args.chat.order_id
      ? getOrderNotificationFields(args.chat.order_id)
      : Promise.resolve({
          creatorId: null,
          orderTitle: null,
        }),
  ]);

  return {
    senderName,
    linkPath: getRecipientLinkPath(args.chat, args.recipientUserId),
    entityType,
    entityId,
    creatorId: orderFields.creatorId,
    orderTitle: orderFields.orderTitle,
  };
}

async function safeSendLineMessageNotification(args: {
  chat: ChatRow;
  inserted: MessageRow;
  content: string;
  senderUserId: string;
  recipientUserId: string;
}) {
  try {
    if (!args.recipientUserId || args.recipientUserId === args.senderUserId) {
      return;
    }

    const context = await buildNotificationContext({
      chat: args.chat,
      senderUserId: args.senderUserId,
      recipientUserId: args.recipientUserId,
    });

    const preview = buildMessagePreview(args.content);
    const bodyLines = [`${context.senderName}さんからメッセージが届きました。`];

    if (context.orderTitle) {
      bodyLines.push("", `案件：${context.orderTitle}`);
    }

    bodyLines.push("", `メッセージ：${preview}`);

    const message = buildLineMessage({
      title: "新着メッセージ",
      body: bodyLines.join("\n"),
      linkPath: context.linkPath,
    });

    const result = await sendLineTextToUserId(args.recipientUserId, message, {
      notificationType: "chat_message_created",
      creatorId: context.creatorId,
      entityType: context.entityType,
      entityId: context.entityId,
    });

    if (!result?.ok) {
      console.warn("chat message line notification not sent:", {
        chatId: args.chat.id,
        messageId: args.inserted.id,
        recipientUserId: args.recipientUserId,
        skipped: result?.skipped ?? false,
        error: result?.error ?? null,
      });
    }
  } catch (error) {
    console.warn("chat message line notification skipped:", error);
  }
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
      .select("id, request_id, order_id, company_user_id, creator_user_id")
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

    const recipientUserId = getRecipientUserId(chat as ChatRow, user.id);

    if (!recipientUserId) {
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

    await safeSendLineMessageNotification({
      chat: chat as ChatRow,
      inserted: inserted as MessageRow,
      content,
      senderUserId: user.id,
      recipientUserId,
    });

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
