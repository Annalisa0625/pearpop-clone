import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import {
  isCreatorLinkStatus,
  isCreatorLinkTheme,
  isCreatorLinkButtonStyle,
  isCreatorLinkFontStyle,
} from "@/lib/trendre-link/constants";
import { getCreatorImageBucket, getOwnedCreatorLinkStoragePath } from "@/lib/trendre-link/storage";
import { validateCreatorLinkSlug } from "@/lib/trendre-link/slug";
import type {
  CreatorLinkPage,
  CreatorLinkPageUpdateResponse,
} from "@/lib/trendre-link/types";
import type { Tables, TablesUpdate } from "@/types/database.types";

type LinkPageRow = Tables<"creator_link_pages">;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(error: string, status: number) {
  const response: CreatorLinkPageUpdateResponse = { ok: false, error };
  return NextResponse.json(response, { status });
}

function toCreatorLinkPage(row: LinkPageRow): CreatorLinkPage {
  if (!isCreatorLinkTheme(row.theme_key)) {
    throw new Error("invalid_theme");
  }

  if (!isCreatorLinkStatus(row.status)) {
    throw new Error("invalid_status");
  }
  if (!isCreatorLinkButtonStyle(row.button_style) || !isCreatorLinkFontStyle(row.font_style)) {
    throw new Error("invalid_appearance");
  }

  return {
    id: row.id,
    creatorId: row.creator_id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    themeKey: row.theme_key,
    accentColor: row.accent_color && /^#[0-9A-Fa-f]{6}$/.test(row.accent_color) ? row.accent_color.toUpperCase() : null,
    buttonStyle: row.button_style,
    fontStyle: row.font_style,
    status: row.status,
    isAcceptingInquiries: row.is_accepting_inquiries,
    setupStep: row.setup_step,
    setupCompletedAt: row.setup_completed_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function PATCH(request: NextRequest) {
  const auth = await getTrendreLinkAuthenticatedUser(request);

  if (!auth.user) {
    return errorResponse(auth.error ?? "ログインが必要です。", 401);
  }

  const body: unknown = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return errorResponse("送信内容が不正です。", 400);
  }

  const pageId = typeof body.pageId === "string" ? body.pageId : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const bio =
    body.bio === null
      ? null
      : typeof body.bio === "string"
        ? body.bio.trim() || null
        : undefined;
  const slugInput = typeof body.slug === "string" ? body.slug : "";
  const themeKey = typeof body.themeKey === "string" ? body.themeKey : "";
  const status = typeof body.status === "string" ? body.status : "";
  const isAcceptingInquiries = body.isAcceptingInquiries;
  const accentColor = body.accentColor === undefined ? undefined : body.accentColor;
  const buttonStyle = body.buttonStyle === undefined ? undefined : body.buttonStyle;
  const fontStyle = body.fontStyle === undefined ? undefined : body.fontStyle;
  const avatarUrl = body.avatarUrl === undefined ? undefined : body.avatarUrl;
  const coverUrl = body.coverUrl === undefined ? undefined : body.coverUrl;

  if (!UUID_PATTERN.test(pageId)) {
    return errorResponse("ページIDが不正です。", 400);
  }

  if (status === "published" && !displayName) {
    return errorResponse("公開する前に表示名を設定してください。", 400);
  }

  if (!displayName) {
    return errorResponse("表示名を入力してください。", 400);
  }

  if (displayName.length > 80) {
    return errorResponse("表示名は80文字以内で入力してください。", 400);
  }

  if (bio === undefined) {
    return errorResponse("自己紹介の形式が不正です。", 400);
  }

  if ((bio?.length ?? 0) > 500) {
    return errorResponse("自己紹介は500文字以内で入力してください。", 400);
  }

  const slugValidation = validateCreatorLinkSlug(slugInput);
  if (!slugValidation.valid) {
    return errorResponse(status === "published" ? "公開URLを確認してください。" : "slugの形式が正しくありません。", 400);
  }

  if (!isCreatorLinkTheme(themeKey)) {
    return errorResponse("テーマの指定が不正です。", 400);
  }

  if (!isCreatorLinkStatus(status)) {
    return errorResponse("公開状態の指定が不正です。", 400);
  }

  if (typeof isAcceptingInquiries !== "boolean") {
    return errorResponse("仕事相談受付の指定が不正です。", 400);
  }
  if (!(accentColor === undefined || accentColor === null || (typeof accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(accentColor)))) {
    return errorResponse("アクセントカラーが正しくありません。", 400);
  }
  if (!(buttonStyle === undefined || (typeof buttonStyle === "string" && isCreatorLinkButtonStyle(buttonStyle)))) {
    return errorResponse("ボタンスタイルが正しくありません。", 400);
  }
  if (!(fontStyle === undefined || (typeof fontStyle === "string" && isCreatorLinkFontStyle(fontStyle)))) {
    return errorResponse("フォントスタイルが正しくありません。", 400);
  }
  if (!(avatarUrl === undefined || avatarUrl === null || typeof avatarUrl === "string") ||
      !(coverUrl === undefined || coverUrl === null || typeof coverUrl === "string")) {
    return errorResponse("画像URLが正しくありません。", 400);
  }

  const { data: currentPage, error: pageError } = await supabaseAdmin
    .from("creator_link_pages")
    .select("*")
    .eq("id", pageId)
    .eq("owner_user_id", auth.user.id)
    .maybeSingle();

  if (pageError) {
    console.error("trendre link page ownership lookup failed");
    return errorResponse("Linkページの確認に失敗しました。", 500);
  }

  if (!currentPage) {
    return errorResponse("更新できるLinkページが見つかりません。", 404);
  }

  const nextAvatarUrl = avatarUrl === undefined ? currentPage.avatar_url : avatarUrl;
  const nextCoverUrl = coverUrl === undefined ? currentPage.cover_url : coverUrl;
  if (nextAvatarUrl && nextAvatarUrl !== currentPage.avatar_url && !getOwnedCreatorLinkStoragePath(nextAvatarUrl, auth.user.id)) {
    return errorResponse("許可されていないアバターURLです。", 400);
  }
  if (nextCoverUrl && nextCoverUrl !== currentPage.cover_url && !getOwnedCreatorLinkStoragePath(nextCoverUrl, auth.user.id)) {
    return errorResponse("許可されていない背景画像URLです。", 400);
  }

  if (slugValidation.normalizedSlug !== currentPage.slug) {
    const { data: available, error: availabilityError } =
      await supabaseAdmin.rpc("is_creator_link_slug_available", {
        p_slug: slugValidation.normalizedSlug,
        p_exclude_page_id: currentPage.id,
        p_owner_user_id: auth.user.id,
      });

    if (availabilityError) {
      console.error("trendre link page slug availability check failed");
      return errorResponse("slugの利用可否を確認できませんでした。", 500);
    }

    if (available !== true) {
      return errorResponse("このslugは使用されています。", 409);
    }
  }

  const update: TablesUpdate<"creator_link_pages"> = {
    display_name: displayName,
    bio,
    slug: slugValidation.normalizedSlug,
    theme_key: themeKey,
    is_accepting_inquiries: isAcceptingInquiries,
    status,
    accent_color: accentColor === undefined ? currentPage.accent_color : accentColor?.toUpperCase() ?? null,
    button_style: buttonStyle === undefined ? currentPage.button_style : buttonStyle,
    font_style: fontStyle === undefined ? currentPage.font_style : fontStyle,
    avatar_url: nextAvatarUrl,
    cover_url: nextCoverUrl,
  };

  if (status === "published") {
    const now = new Date().toISOString();
    update.published_at = currentPage.published_at ?? now;
    update.setup_completed_at = currentPage.setup_completed_at ?? now;
    update.setup_step = Math.max(currentPage.setup_step, 1);
  }

  const { data: updatedPage, error: updateError } = await supabaseAdmin
    .from("creator_link_pages")
    .update(update)
    .eq("id", currentPage.id)
    .eq("owner_user_id", auth.user.id)
    .select("*")
    .single();

  if (updateError || !updatedPage) {
    console.error("trendre link page update failed");
    if (updateError?.code === "23505") {
      return errorResponse("このslugは使用されています。", 409);
    }
    return errorResponse("Linkページの保存に失敗しました。", 500);
  }

  try {
    const oldPaths = [
      currentPage.avatar_url !== nextAvatarUrl && currentPage.avatar_url ? getOwnedCreatorLinkStoragePath(currentPage.avatar_url, auth.user.id) : null,
      currentPage.cover_url !== nextCoverUrl && currentPage.cover_url ? getOwnedCreatorLinkStoragePath(currentPage.cover_url, auth.user.id) : null,
    ].filter((path): path is string => Boolean(path));
    if (oldPaths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from(getCreatorImageBucket()).remove(oldPaths);
      if (removeError) console.error("trendre link old image cleanup failed");
    }
    const response: CreatorLinkPageUpdateResponse = {
      ok: true,
      page: toCreatorLinkPage(updatedPage),
    };
    return NextResponse.json(response);
  } catch {
    return errorResponse("保存後のLinkページ情報が不正です。", 500);
  }
}
