import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import {
  findOwnedPage,
  toCreatorLinkItem,
  UUID_PATTERN,
} from "@/lib/trendre-link/items-server";
import type { CreatorLinkItemsReorderResponse } from "@/lib/trendre-link/types";

type RequestBody = {
  pageId?: unknown;
  items?: unknown;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json<CreatorLinkItemsReorderResponse>(
    { ok: false, error },
    { status }
  );
}

export async function PATCH(request: NextRequest) {
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
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 200) {
    return errorResponse("並び順の入力内容を確認してください。", 400);
  }

  const order = new Map<string, number>();
  for (const candidate of body.items) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      !("sortOrder" in candidate) ||
      typeof candidate.id !== "string" ||
      !UUID_PATTERN.test(candidate.id) ||
      !Number.isInteger(candidate.sortOrder) ||
      Number(candidate.sortOrder) < 0 ||
      order.has(candidate.id)
    ) {
      return errorResponse("並び順の入力内容を確認してください。", 400);
    }
    order.set(candidate.id, Number(candidate.sortOrder));
  }
  if (new Set(order.values()).size !== order.size) {
    return errorResponse("並び順が重複しています。", 400);
  }

  try {
    const page = await findOwnedPage(body.pageId, auth.user.id);
    if (!page) return errorResponse("ページが見つかりません。", 404);

    const ids = [...order.keys()];
    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("creator_link_items")
      .select("*")
      .eq("page_id", page.id)
      .in("id", ids);
    if (lookupError) throw new Error("items_lookup_failed");
    if (!rows || rows.length !== ids.length) {
      return errorResponse("並び替えるアイテムが見つかりません。", 404);
    }

    const updates = rows.map((row) => ({
      ...row,
      sort_order: order.get(row.id) ?? row.sort_order,
    }));
    const { data, error } = await supabaseAdmin
      .from("creator_link_items")
      .upsert(updates, { onConflict: "id" })
      .select("*");
    if (error) throw new Error("reorder_failed");

    return NextResponse.json<CreatorLinkItemsReorderResponse>({
      ok: true,
      items: data
        .map(toCreatorLinkItem)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    });
  } catch (error) {
    console.error("[trendre-link/items/reorder] 並び順を保存できませんでした。", {
      cause: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse("並び順を保存できませんでした。時間をおいて再度お試しください。", 500);
  }
}
