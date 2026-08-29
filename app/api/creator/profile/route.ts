import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_SOCIAL_PLATFORMS = new Set([
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Website",
]);

const MAX_SOCIAL_ACCOUNTS = 20;

type SocialAccountInput = {
  platform: string;
  url: string;
  handle: string;
  follower_range: string;
  audience_country: string;
};

type ProfileSaveInput = {
  displayName: string;
  category: string;
  country: string;
  prefecture: string | null;
  canReceiveProducts: boolean;
  contentLanguage: string;
  responseLanguage: string;
  subCategories: string[];
  avatarUrl: string | null;
  shouldPublishCreator: boolean;
  socialAccountsChanged: boolean;
  socialAccounts?: SocialAccountInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function nullableText(value: unknown, maxLength: number) {
  if (value === null) return null;
  return typeof value === "string" && value.trim().length <= maxLength
    ? value.trim() || null
    : undefined;
}

function parseSocialAccounts(value: unknown): SocialAccountInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SOCIAL_ACCOUNTS) return null;

  const socials: SocialAccountInput[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const platform = requiredText(item.platform, 40);
    const url = requiredText(item.url, 2048);
    const handle = requiredText(item.handle, 320);
    const follower_range = requiredText(item.follower_range, 80);
    const audience_country = requiredText(item.audience_country, 120);

    if (!platform || !ALLOWED_SOCIAL_PLATFORMS.has(platform) || !url || !handle || !follower_range || !audience_country) {
      return null;
    }

    socials.push({ platform, url, handle, follower_range, audience_country });
  }

  return socials;
}

function parseBody(value: unknown): ProfileSaveInput | null {
  if (!isRecord(value)) return null;

  const displayName = requiredText(value.displayName, 80);
  const category = requiredText(value.category, 120);
  const country = requiredText(value.country, 120);
  const prefecture = nullableText(value.prefecture, 500);
  const contentLanguage = requiredText(value.contentLanguage, 80);
  const responseLanguage = requiredText(value.responseLanguage, 80);
  const avatarUrl = nullableText(value.avatarUrl, 2048);
  const rawCategories = value.subCategories;

  if (
    !displayName ||
    !category ||
    !country ||
    prefecture === undefined ||
    !contentLanguage ||
    !responseLanguage ||
    avatarUrl === undefined ||
    typeof value.canReceiveProducts !== "boolean" ||
    typeof value.shouldPublishCreator !== "boolean" ||
    typeof value.socialAccountsChanged !== "boolean" ||
    !Array.isArray(rawCategories) ||
    rawCategories.length === 0 ||
    rawCategories.length > 5
  ) {
    return null;
  }

  const subCategories = rawCategories.map((item) => requiredText(item, 120));
  if (subCategories.some((item) => !item)) return null;

  let socialAccounts: SocialAccountInput[] | undefined;
  if (value.socialAccountsChanged) {
    const parsedSocialAccounts = parseSocialAccounts(value.socialAccounts);
    if (!parsedSocialAccounts) return null;
    socialAccounts = parsedSocialAccounts;
  } else if (value.socialAccounts !== undefined) {
    return null;
  }

  return {
    displayName,
    category,
    country,
    prefecture,
    canReceiveProducts: value.canReceiveProducts,
    contentLanguage,
    responseLanguage,
    subCategories: subCategories as string[],
    avatarUrl,
    shouldPublishCreator: value.shouldPublishCreator,
    socialAccountsChanged: value.socialAccountsChanged,
    socialAccounts,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "送信内容が不正です。" }, { status: 400 });
  }

  const { data: creator, error: creatorError } = await supabaseAdmin
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError) {
    console.error("creator profile ownership lookup failed");
    return NextResponse.json({ error: "Creator情報の確認に失敗しました。" }, { status: 500 });
  }

  if (!creator) {
    return NextResponse.json({ error: "Creator情報が見つかりません。" }, { status: 404 });
  }

  const { error: saveError } = await supabaseAdmin.rpc("save_creator_profile", {
    p_user_id: user.id,
    p_payload: {
      display_name: body.displayName,
      category: body.category,
      country: body.country,
      prefecture: body.prefecture,
      can_receive_products: body.canReceiveProducts,
      content_language: body.contentLanguage,
      response_language: body.responseLanguage,
      sub_categories: body.subCategories,
      avatar_url: body.avatarUrl,
      should_publish_creator: body.shouldPublishCreator,
      social_accounts_changed: body.socialAccountsChanged,
      ...(body.socialAccountsChanged
        ? {
            social_accounts: body.socialAccounts?.map((account) => ({
              platform: account.platform,
              url: account.url,
              handle: account.handle,
              follower_range: account.follower_range,
              audience_country: account.audience_country,
            })),
          }
        : {}),
    },
  });

  if (saveError) {
    console.error("creator profile save failed", { code: saveError.code });
    return NextResponse.json({ error: "プロフィールの保存に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
