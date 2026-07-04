// File: lib/notifications/in-app.ts
import { createHash } from "crypto";
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

  /**
   * 同じ処理が二重送信されても通知を1件に保つためのキー。
   * 例: shipping_address_shared:{orderId}, product_shipped:{orderId}
   */
  dedupeKey?: string | null;
};

function createDeterministicUuid(key: string) {
  const hash = createHash("sha256")
    .update(`trendre:notification:${key}`)
    .digest("hex")
    .slice(0, 32);

  const version = `5${hash.slice(13, 16)}`;
  const variant = `${((parseInt(hash[16] ?? "0", 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`;

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    version,
    variant,
    hash.slice(20, 32),
  ].join("-");
}

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
    const nowIso = new Date().toISOString();
    const dedupeKey = input.dedupeKey?.trim();

    const row: Record<string, unknown> = {
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
    };

    if (dedupeKey) {
      row.id = createDeterministicUuid(dedupeKey);
      row.created_at = nowIso;
      row.read_at = null;
      row.archived_at = null;

      const { error } = await admin
        .from("notifications")
        .upsert(row, { onConflict: "id" });

      if (error) {
        console.error("in-app notification upsert error:", error);
        return { ok: false, skipped: false, error: error.message };
      }

      return { ok: true, skipped: false, error: null };
    }

    const { error } = await admin.from("notifications").insert(row);

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
