// File: lib/notifications/createNotification.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type NotificationImportance = "low" | "normal" | "high";

export type CreateNotificationInput = {
  recipientUserId: string;
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
  metadata?: Record<string, unknown>;

  dedupeKey?: string | null;

  /**
   * 今はLINE送信は実行しない。
   * ただし、line_enabled=true かつLINE連携済みなら
   * notification_deliveries に pending 行を作れる設計にしておく。
   */
  createLineDelivery?: boolean;
};

export type CreateNotificationResult = {
  notification: any | null;
  skipped: boolean;
  reason?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeImportance(
  value: NotificationImportance | null | undefined
): NotificationImportance {
  if (value === "low" || value === "high" || value === "normal") {
    return value;
  }

  return "normal";
}

function isMutedType(mutedTypes: unknown, notificationType: string) {
  if (!Array.isArray(mutedTypes)) return false;

  return mutedTypes
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .includes(notificationType);
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const admin = supabaseAdmin as any;

  const recipientUserId = normalizeText(input.recipientUserId);
  const notificationType = normalizeText(input.notificationType);
  const title = normalizeText(input.title);

  if (!recipientUserId) {
    return {
      notification: null,
      skipped: true,
      reason: "recipientUserId is required",
    };
  }

  if (!notificationType) {
    return {
      notification: null,
      skipped: true,
      reason: "notificationType is required",
    };
  }

  if (!title) {
    return {
      notification: null,
      skipped: true,
      reason: "title is required",
    };
  }

  const { data: preference, error: preferenceError } = await admin
    .from("notification_preferences")
    .select("in_app_enabled, line_enabled, muted_types")
    .eq("user_id", recipientUserId)
    .maybeSingle();

  if (preferenceError) {
    console.warn("notification preference load skipped:", preferenceError);
  }

  const inAppEnabled = preference?.in_app_enabled !== false;
  const lineEnabled = preference?.line_enabled === true;

  if (isMutedType(preference?.muted_types, notificationType)) {
    return {
      notification: null,
      skipped: true,
      reason: "notification type is muted",
    };
  }

  if (!inAppEnabled) {
    return {
      notification: null,
      skipped: true,
      reason: "in-app notifications disabled",
    };
  }

  const notificationPayload = {
    recipient_user_id: recipientUserId,
    actor_user_id: input.actorUserId ?? null,

    notification_type: notificationType,
    title,
    body: input.body ?? null,

    link_path: input.linkPath ?? null,

    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,

    order_id: input.orderId ?? null,
    chat_id: input.chatId ?? null,
    message_id: input.messageId ?? null,

    importance: normalizeImportance(input.importance),
    metadata: input.metadata ?? {},

    dedupe_key: input.dedupeKey ?? null,
  };

  const { data: inserted, error: insertError } = await admin
    .from("notifications")
    .insert(notificationPayload)
    .select(
      `
      id,
      recipient_user_id,
      actor_user_id,
      notification_type,
      title,
      body,
      link_path,
      entity_type,
      entity_id,
      order_id,
      chat_id,
      message_id,
      importance,
      read_at,
      archived_at,
      metadata,
      dedupe_key,
      created_at,
      updated_at
    `
    )
    .single();

  if (insertError) {
    const isDuplicate = insertError.code === "23505";

    if (isDuplicate && input.dedupeKey) {
      const { data: existing, error: existingError } = await admin
        .from("notifications")
        .select(
          `
          id,
          recipient_user_id,
          actor_user_id,
          notification_type,
          title,
          body,
          link_path,
          entity_type,
          entity_id,
          order_id,
          chat_id,
          message_id,
          importance,
          read_at,
          archived_at,
          metadata,
          dedupe_key,
          created_at,
          updated_at
        `
        )
        .eq("recipient_user_id", recipientUserId)
        .eq("dedupe_key", input.dedupeKey)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      return {
        notification: existing ?? null,
        skipped: true,
        reason: "duplicate notification",
      };
    }

    throw insertError;
  }

  const notification = inserted ?? null;

  if (
    notification?.id &&
    input.createLineDelivery === true &&
    lineEnabled === true
  ) {
    const { data: lineAccount, error: lineAccountError } = await admin
      .from("notification_external_accounts")
      .select("provider_user_id")
      .eq("user_id", recipientUserId)
      .eq("provider", "line")
      .eq("is_connected", true)
      .maybeSingle();

    if (lineAccountError) {
      console.warn("line account load skipped:", lineAccountError);
    }

    if (lineAccount?.provider_user_id) {
      const { error: deliveryError } = await admin
        .from("notification_deliveries")
        .insert({
          notification_id: notification.id,
          recipient_user_id: recipientUserId,
          channel: "line",
          provider: "line",
          provider_recipient_id: lineAccount.provider_user_id,
          status: "pending",
          metadata: {
            notification_type: notificationType,
            link_path: input.linkPath ?? null,
          },
        });

      if (deliveryError && deliveryError.code !== "23505") {
        console.warn("line delivery enqueue skipped:", deliveryError);
      }
    }
  }

  return {
    notification,
    skipped: false,
  };
}

export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<CreateNotificationResult[]> {
  const results: CreateNotificationResult[] = [];

  for (const input of inputs) {
    results.push(await createNotification(input));
  }

  return results;
}