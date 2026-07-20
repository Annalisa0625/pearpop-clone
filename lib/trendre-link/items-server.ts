import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isCreatorLinkItemType } from "@/lib/trendre-link/constants";
import type { CreatorLinkItem } from "@/lib/trendre-link/types";
import { normalizeCreatorLinkItemAppearance } from "@/lib/trendre-link/item-validation";
import type { Tables } from "@/types/database.types";

type ItemRow = Tables<"creator_link_items">;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toCreatorLinkItem(row: ItemRow): CreatorLinkItem {
  if (!isCreatorLinkItemType(row.item_type)) {
    throw new Error("invalid_item_type");
  }

  return {
    id: row.id,
    pageId: row.page_id,
    itemType: row.item_type,
    platform: row.platform,
    title: row.title,
    description: row.description,
    url: row.url,
    imageUrl: row.image_url,
    metadata: normalizeCreatorLinkItemAppearance(row.metadata),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findOwnedPage(pageId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("creator_link_pages")
    .select("id")
    .eq("id", pageId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw new Error("page_lookup_failed");
  return data;
}

export async function findOwnedItem(itemId: string, userId: string) {
  const { data: item, error: itemError } = await supabaseAdmin
    .from("creator_link_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) throw new Error("item_lookup_failed");
  if (!item) return null;

  const page = await findOwnedPage(item.page_id, userId);
  return page ? item : null;
}
