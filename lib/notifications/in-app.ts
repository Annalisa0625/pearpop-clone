// File: lib/notifications/in-app.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type NotificationImportance = "low" | "normal" | "high";

type CreateInAppNotificationInput = {
  recipientUserId?: string | null;
  actorUserId?: string | null;
  notificationType: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  orderId?: string | null;
  chatId?: string | null;
  messageId?: string | null;
  importance?: NotificationImportance;
  metadata?: Record<string, unknown> | null;
};

export function getOrderNotificationName(order: {
  product_name?: string | null;
  menu_title_snapshot?: string | null;
}) {
  const productName = order.product_name?.trim();
  const menuTitle = order.menu_title_snapshot?.trim();

  return productName || menuTitle || "注文";
}

export async function createInAppNotification(input: CreateInAppNotificationInput) {
  const recipientUserId = input.recipientUserId?.trim();

  if (!recipientUserId) {
    return { ok: false, skipped: true, error: "recipient_user_id is missing" };
  }

  try {
    const admin = supabaseAdmin as any;

    const { error } = await admin.from("notifications").insert({
      recipient_user_id: recipientUserId,
      actor_user_id: input.actorUserId ?? null,
      notification_type: input.notificationType,
      title: input.title,
      body: input.body ?? null,
      link_path: input.linkPath ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      order_id: input.orderId ?? null,
      chat_id: input.chatId ?? null,
      message_id: input.messageId ?? null,
      importance: input.importance ?? "normal",
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("in-app notification insert error:", error);
      return { ok: false, skipped: false, error: error.message };
    }

    return { ok: true, skipped: false, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("in-app notification insert exception:", error);

    return { ok: false, skipped: false, error: message };
  }
}
