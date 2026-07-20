import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import {
  isCreatorLinkSocialPlatform,
  normalizeSocialProfile,
  validateCreatorLinkItemAppearance,
  validateGeneralLink,
} from "@/lib/trendre-link/item-validation";
import {
  findOwnedItem,
  toCreatorLinkItem,
  UUID_PATTERN,
} from "@/lib/trendre-link/items-server";
import type {
  CreatorLinkItemDeleteResponse,
  CreatorLinkItemMutationResponse,
} from "@/lib/trendre-link/types";
import type { TablesUpdate } from "@/types/database.types";

type RouteContext = { params: Promise<{ id: string }> };
type RequestBody = {
  platform?: unknown;
  title?: unknown;
  url?: unknown;
  sortOrder?: unknown;
  isVisible?: unknown;
  metadata?: unknown;
};

function mutationError(error: string, status: number) {
  return NextResponse.json<CreatorLinkItemMutationResponse>(
    { ok: false, error },
    { status }
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return mutationError("ログインが必要です。", 401);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return mutationError("アイテムIDが正しくありません。", 400);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return mutationError("入力内容を確認してください。", 400);
  }

  try {
    const item = await findOwnedItem(id, auth.user.id);
    if (!item) return mutationError("アイテムが見つかりません。", 404);
    if (item.item_type !== "social" && item.item_type !== "link") {
      return mutationError("このアイテムはこの画面から編集できません。", 400);
    }

    let values: {
      platform: string | null;
      title: string;
      description: string | null;
      url: string;
    };

    if (item.item_type === "social") {
      if (
        typeof body.platform !== "string" ||
        !isCreatorLinkSocialPlatform(body.platform) ||
        typeof body.url !== "string"
      ) {
        return mutationError("SNSの入力内容を確認してください。", 400);
      }
      const normalized = normalizeSocialProfile(body.platform, body.url);
      if (!normalized.ok) return mutationError(normalized.error, 400);
      values = {
        platform: body.platform,
        title: normalized.value.title,
        description: null,
        url: normalized.value.url,
      };
      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from("creator_link_items")
        .select("id")
        .eq("page_id", item.page_id)
        .eq("item_type", "social")
        .eq("platform", body.platform)
        .neq("id", item.id)
        .limit(1)
        .maybeSingle();
      if (duplicateError) throw new Error("social_lookup_failed");
      if (duplicate) return mutationError("このSNSはすでに登録されています。", 409);
    } else {
      if (typeof body.title !== "string" || typeof body.url !== "string") {
        return mutationError("リンクの入力内容を確認してください。", 400);
      }
      const validated = validateGeneralLink({ title: body.title, url: body.url });
      if (!validated.ok) return mutationError(validated.error, 400);
      values = { platform: null, ...validated.value };
    }

    const appearance = body.metadata === undefined ? null : validateCreatorLinkItemAppearance(body.metadata);
    if (appearance && !appearance.ok) return mutationError(appearance.error, 400);
    const updates: TablesUpdate<"creator_link_items"> = { ...values };
    if (appearance?.ok) updates.metadata = appearance.value;
    if (body.sortOrder !== undefined) {
      if (!Number.isInteger(body.sortOrder) || Number(body.sortOrder) < 0) {
        return mutationError("並び順が正しくありません。", 400);
      }
      updates.sort_order = Number(body.sortOrder);
    }
    if (body.isVisible !== undefined) {
      if (typeof body.isVisible !== "boolean") {
        return mutationError("公開設定が正しくありません。", 400);
      }
      updates.is_visible = body.isVisible;
    }

    const { data, error } = await supabaseAdmin
      .from("creator_link_items")
      .update(updates)
      .eq("id", item.id)
      .eq("page_id", item.page_id)
      .select("*")
      .single();
    if (error) throw new Error("update_failed");

    return NextResponse.json<CreatorLinkItemMutationResponse>({
      ok: true,
      item: toCreatorLinkItem(data),
    });
  } catch (error) {
    console.error("[trendre-link/items] アイテムを更新できませんでした。", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return mutationError("アイテムを更新できませんでした。時間をおいて再度お試しください。", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) {
    return NextResponse.json<CreatorLinkItemDeleteResponse>(
      { ok: false, error: "ログインが必要です。" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json<CreatorLinkItemDeleteResponse>(
      { ok: false, error: "アイテムIDが正しくありません。" },
      { status: 400 }
    );
  }

  try {
    const item = await findOwnedItem(id, auth.user.id);
    if (!item) {
      return NextResponse.json<CreatorLinkItemDeleteResponse>(
        { ok: false, error: "アイテムが見つかりません。" },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("creator_link_items")
      .delete()
      .eq("id", item.id)
      .eq("page_id", item.page_id);
    if (error) throw new Error("delete_failed");

    return NextResponse.json<CreatorLinkItemDeleteResponse>({ ok: true, deletedItemId: id });
  } catch (error) {
    console.error("[trendre-link/items] アイテムを削除できませんでした。", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json<CreatorLinkItemDeleteResponse>(
      { ok: false, error: "アイテムを削除できませんでした。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
