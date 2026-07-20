import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTrendreLinkAuthenticatedUser } from "@/lib/trendre-link/server-auth";
import {
  isCreatorLinkInquiryTemplate,
  isCreatorLinkItemType,
  isCreatorLinkStatus,
  isCreatorLinkTheme,
  isCreatorLinkButtonStyle,
  isCreatorLinkFontStyle,
} from "@/lib/trendre-link/constants";
import { normalizeCreatorLinkItemAppearance } from "@/lib/trendre-link/item-validation";
import {
  normalizeCreatorLinkSlug,
  validateCreatorLinkSlug,
} from "@/lib/trendre-link/slug";
import type {
  CreatorLinkBootstrapResponse,
  CreatorLinkInquiryType,
  CreatorLinkItem,
  CreatorLinkPage,
} from "@/lib/trendre-link/types";
import type { Tables, TablesInsert } from "@/types/database.types";

type CreatorRow = Tables<"creators">;
type LinkPageRow = Tables<"creator_link_pages">;
type LinkItemRow = Tables<"creator_link_items">;
type InquiryTypeRow = Tables<"creator_link_inquiry_types">;

class BootstrapError extends Error {
  constructor(
    message: string,
    readonly status = 500
  ) {
    super(message);
  }
}

function metadataText(user: User, key: string): string | null {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDisplayName(user: User): string {
  return (
    metadataText(user, "display_name") ??
    metadataText(user, "full_name") ??
    metadataText(user, "name") ??
    user.email?.split("@")[0]?.trim() ??
    "Creator"
  );
}

function getAvatarUrl(user: User): string | null {
  return metadataText(user, "avatar_url") ?? metadataText(user, "picture");
}

function randomSlugSuffix(): string {
  return randomBytes(3).toString("hex").slice(0, 4);
}

function withSuffix(base: string): string {
  const trimmedBase = base.slice(0, 25).replace(/-+$/g, "");
  return `${trimmedBase || "user"}-${randomSlugSuffix()}`;
}

async function isSlugAvailable(
  slug: string,
  ownerUserId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "is_creator_link_slug_available",
    {
      p_slug: slug,
      p_owner_user_id: ownerUserId,
    }
  );

  if (error) {
    throw new BootstrapError("slugの利用可否を確認できませんでした。");
  }

  return data === true;
}

async function chooseInitialSlug(
  candidates: Array<string | null>,
  ownerUserId: string
) {
  const normalizedCandidates = candidates
    .map((candidate) => normalizeCreatorLinkSlug(candidate ?? ""))
    .filter((candidate, index, all) => {
      return validateCreatorLinkSlug(candidate).valid && all.indexOf(candidate) === index;
    });

  const base = normalizedCandidates[0] ?? "user";

  for (const candidate of normalizedCandidates) {
    if (await isSlugAvailable(candidate, ownerUserId)) return candidate;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = withSuffix(base);
    if (await isSlugAvailable(candidate, ownerUserId)) return candidate;
  }

  throw new BootstrapError("利用可能なslugを作成できませんでした。", 409);
}

function toPage(row: LinkPageRow): CreatorLinkPage {
  if (!isCreatorLinkTheme(row.theme_key)) {
    throw new BootstrapError("Linkページのテーマ設定が不正です。");
  }

  if (!isCreatorLinkStatus(row.status)) {
    throw new BootstrapError("Linkページの公開状態が不正です。");
  }
  if (!isCreatorLinkButtonStyle(row.button_style) || !isCreatorLinkFontStyle(row.font_style)) {
    throw new BootstrapError("Linkページの表示設定が不正です。");
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

function toItem(row: LinkItemRow): CreatorLinkItem {
  if (!isCreatorLinkItemType(row.item_type)) {
    throw new BootstrapError("Linkアイテムの種別が不正です。");
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

function toInquiryType(row: InquiryTypeRow): CreatorLinkInquiryType {
  if (
    row.template_key !== null &&
    !isCreatorLinkInquiryTemplate(row.template_key)
  ) {
    throw new BootstrapError("相談テンプレートの種別が不正です。");
  }

  return {
    id: row.id,
    pageId: row.page_id,
    templateKey: row.template_key,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    isEnabled: row.is_enabled,
    isCustom: row.is_custom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadCreator(userId: string): Promise<CreatorRow | null> {
  const { data, error } = await supabaseAdmin
    .from("creators")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new BootstrapError("クリエイター情報の確認に失敗しました。");
  return data;
}

async function ensureSupportingRows(user: User) {
  const avatarUrl = getAvatarUrl(user);
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      avatar_url: avatarUrl,
      bio: null,
      is_public: false,
      onboarding_completed: false,
      public_profile_completed: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (profileError) throw new BootstrapError("プロフィールの準備に失敗しました。");

  const { data: role, error: roleLoadError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "creator")
    .maybeSingle();

  if (roleLoadError) throw new BootstrapError("ユーザー権限の確認に失敗しました。");

  if (!role) {
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "creator" });

    if (roleInsertError && roleInsertError.code !== "23505") {
      throw new BootstrapError("ユーザー権限の準備に失敗しました。");
    }
  }

  const { data: state, error: stateLoadError } = await supabaseAdmin
    .from("user_states")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateLoadError) throw new BootstrapError("ユーザー状態の確認に失敗しました。");

  if (!state) {
    const { error: stateInsertError } = await supabaseAdmin
      .from("user_states")
      .insert({
        user_id: user.id,
        creator_profile_completed: false,
        company_profile_completed: false,
        onboarding_completed: false,
      });

    if (stateInsertError && stateInsertError.code !== "23505") {
      throw new BootstrapError("ユーザー状態の準備に失敗しました。");
    }
  }
}

async function createLinkOnlyCreator(
  user: User,
  displayName: string
): Promise<{ creator: CreatorRow; created: boolean }> {
  if (!user.email) {
    throw new BootstrapError("メールアドレスを確認できません。", 400);
  }

  const insert: TablesInsert<"creators"> = {
    user_id: user.id,
    contact_email: user.email,
    display_name: displayName,
    full_name: displayName,
    approval_status: "approved",
    is_public: false,
    is_suspended: false,
    stripe_onboarding_completed: false,
    avatar_url: getAvatarUrl(user),
  };

  const { data, error } = await supabaseAdmin
    .from("creators")
    .insert(insert)
    .select("*")
    .single();

  if (!error && data) return { creator: data, created: true };

  if (error?.code === "23505") {
    const existing = await loadCreator(user.id);
    if (existing) return { creator: existing, created: false };
  }

  throw new BootstrapError("クリエイター情報の作成に失敗しました。");
}

async function loadPage(creatorId: string): Promise<LinkPageRow | null> {
  const { data, error } = await supabaseAdmin
    .from("creator_link_pages")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) throw new BootstrapError("Linkページの確認に失敗しました。");
  return data;
}

async function createPage(
  creator: CreatorRow,
  user: User,
  profileUsername: string | null
): Promise<{ page: LinkPageRow; created: boolean }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await loadPage(creator.id);
    if (existing) return { page: existing, created: false };

    const slug = await chooseInitialSlug(
      [
        creator.public_slug,
        profileUsername,
        metadataText(user, "display_name"),
        metadataText(user, "full_name"),
        metadataText(user, "name"),
        user.email?.split("@")[0] ?? null,
      ],
      user.id
    );

    const { data, error } = await supabaseAdmin
      .from("creator_link_pages")
      .insert({
        creator_id: creator.id,
        owner_user_id: user.id,
        slug,
        display_name: creator.display_name,
        bio: creator.bio,
        avatar_url: creator.avatar_url,
        cover_url: creator.cover_image_url,
        status: "draft",
        setup_step: 0,
      })
      .select("*")
      .single();

    if (!error && data) return { page: data, created: true };

    if (error?.code === "23505") {
      const racedPage = await loadPage(creator.id);
      if (racedPage) return { page: racedPage, created: false };
      continue;
    }

    throw new BootstrapError("Linkページの作成に失敗しました。");
  }

  throw new BootstrapError("Linkページの作成が競合しました。もう一度お試しください。", 409);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getTrendreLinkAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        { ok: false, error: auth.error ?? "ログインが必要です。" },
        { status: 401 }
      );
    }

    const user = auth.user;
    const displayName = getDisplayName(user);
    let creator = await loadCreator(user.id);
    let createdCreator = false;

    if (!creator) {
      const result = await createLinkOnlyCreator(user, displayName);
      creator = result.creator;
      createdCreator = result.created;
    }

    await ensureSupportingRows(user);

    const { data: profile, error: profileLoadError } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileLoadError) {
      throw new BootstrapError("プロフィールの確認に失敗しました。");
    }

    const pageResult = await createPage(creator, user, profile?.username ?? null);

    const [itemsResult, inquiryTypesResult] = await Promise.all([
      supabaseAdmin
        .from("creator_link_items")
        .select("*")
        .eq("page_id", pageResult.page.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("creator_link_inquiry_types")
        .select("*")
        .eq("page_id", pageResult.page.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (itemsResult.error || inquiryTypesResult.error) {
      throw new BootstrapError("Linkページの初期データ取得に失敗しました。");
    }

    const response: CreatorLinkBootstrapResponse = {
      ok: true,
      createdCreator,
      createdPage: pageResult.created,
      page: toPage(pageResult.page),
      items: (itemsResult.data ?? []).map(toItem),
      inquiryTypes: (inquiryTypesResult.data ?? []).map(toInquiryType),
    };

    return NextResponse.json(response);
  } catch (error) {
    const status = error instanceof BootstrapError ? error.status : 500;
    const message =
      error instanceof BootstrapError
        ? error.message
        : "Linkページの準備中にエラーが発生しました。";

    console.error("trendre link bootstrap failed");
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
