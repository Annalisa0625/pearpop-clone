import { isCreatorOnlyRelease } from "@/lib/release-mode";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const C_ONLY_MARKETPLACE_NOTIFICATION_TYPES = [
  "new_order",
  "order_created",
  "order_accepted",
  "order_declined",
  "order_revision_requested",
  "revision_requested",
  "order_completed",
  "shipping_address_shared",
  "product_shipped",
  "product_received",
  "materials_confirmed",
  "order_delivered",
  "creator_payout_paid",
  "trendre_link_quote_received",
  "trendre_link_order_created",
  "line_test",
] as const;

export async function isCreatorOnlyNotificationViewer(userId: string) {
  if (!isCreatorOnlyRelease()) return false;

  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;

  return roles?.some((role) => role.role === "creator") ?? false;
}
