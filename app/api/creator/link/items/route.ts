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
  findOwnedPage,
  toCreatorLinkItem,
  UUID_PATTERN,
} from "@/lib/trendre-link/items-server";
import type { CreatorLinkItemMutationResponse } from "@/lib/trendre-link/types";

type RequestBody = {
  pageId?: unknown;
  itemType?: unknown;
  platform?: unknown;
  title?: unknown;
  url?: unknown;
  metadata?: unknown;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkItemMutationResponse>(
    { ok: false, error },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);
  if (!auth.user) return errorResponse("ログインが必要です。", 401);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse("入力内容を確認してください。", 400);
  }

  if (typeof body.pageId !== "string" || !UUID_PATTERN.test(body.pageId)) {
    return errorResponse("ページIDが正しくありません。", 400);
  }
  if (body.itemType !== "social" && body.itemType !== "link") {
    return errorResponse("追加できないアイテム種別です。", 400);
  }

  try {
    const page = await findOwnedPage(body.pageId, auth.user.id);
    if (!page) return errorResponse("ページが見つかりません。", 404);

    let values: {
      platform: string | null;
      title: string;
      description: string | null;
      url: string;
    };
    const appearance = validateCreatorLinkItemAppearance(body.metadata);
    if (!appearance.ok) return errorResponse(appearance.error, 400);

    if (body.itemType === "social") {
      if (
        typeof body.platform !== "string" ||
        !isCreatorLinkSocialPlatform(body.platform) ||
        typeof body.url !== "string"
      ) {
        return errorResponse("SNSの入力内容を確認してください。", 400);
      }
      const normalized = normalizeSocialProfile(body.platform, body.url);
      if (!normalized.ok) return errorResponse(normalized.error, 400);
      values = {
        platform: body.platform,
        title: normalized.value.title,
        description: null,
        url: normalized.value.url,
      };
      const { data: existingSocial, error: existingSocialError } = await supabaseAdmin
        .from("creator_link_items")
        .select("id")
        .eq("page_id", page.id)
        .eq("item_type", "social")
        .eq("platform", body.platform)
        .limit(1)
        .maybeSingle();
      if (existingSocialError) throw new Error("social_lookup_failed");
      if (existingSocial) return errorResponse("このSNSはすでに登録されています。", 409);
    } else {
      if (typeof body.title !== "string" || typeof body.url !== "string") {
        return errorResponse("リンクの入力内容を確認してください。", 400);
      }
      const validated = validateGeneralLink({ title: body.title, url: body.url });
      if (!validated.ok) return errorResponse(validated.error, 400);
      values = { platform: null, ...validated.value };
    }

    const { data: lastItem, error: sortError } = await supabaseAdmin
      .from("creator_link_items")
      .select("sort_order")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sortError) throw new Error("sort_lookup_failed");

    const { data, error } = await supabaseAdmin
      .from("creator_link_items")
      .insert({
        page_id: page.id,
        item_type: body.itemType,
        platform: values.platform,
        title: values.title,
        description: values.description,
        url: values.url,
        metadata: appearance.value,
        sort_order: (lastItem?.sort_order ?? -1) + 1,
        is_visible: true,
      })
      .select("*")
      .single();
    if (error) throw new Error("insert_failed");

    return NextResponse.json<CreatorLinkItemMutationResponse>({
      ok: true,
      item: toCreatorLinkItem(data),
    });
  } catch (error) {
    console.error("[trendre-link/items] アイテムを追加できませんでした。", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse("アイテムを追加できませんでした。時間をおいて再度お試しください。", 500);
  }
}
