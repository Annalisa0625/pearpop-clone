// app/api/signup/complete-creator/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SocialAccountInput = {
  platform: string;
  username_or_url: string;
  follower_range: string;
  audience_country: string;
};

type FirstMenuInput = {
  menu_type: string;
  price: number;
  delivery_days: number;
  description?: string;
  allow_secondary_use?: boolean;
};

type PortfolioAssetInput = {
  asset_url: string;
  title?: string | null;
  sort_order?: number | null;
};

type RequestBody = {
  auth_mode: "email" | "oauth";
  access_token?: string;

  username: string;
  full_name: string;
  email?: string;
  password?: string;

  avatar_url?: string | null;
  portfolio_assets?: PortfolioAssetInput[];

  country: string;
  prefecture: string;
  city?: string;

  main_category: string;
  sub_categories?: string[];
  content_language: string;
  response_language: string;
  short_bio?: string;
  is_adult_confirmed: boolean;

  phone_country_code: string;
  phone_number: string;
  phone_verified: boolean;

  social_accounts: SocialAccountInput[];
  first_menu: FirstMenuInput;

  agreed_to_terms?: boolean;
  agreed_to_privacy?: boolean;
};

const TERMS_VERSION = "2026-03-29-v1";
const PRIVACY_VERSION = "2026-03-29-v1";

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "login",
  "signup",
  "creator",
  "company",
  "dashboard",
  "home",
  "privacy",
  "terms",
  "legal",
]);

function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

function isValidUsername(input: string) {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(input);
}

function buildSocialUrl(platform: string, usernameOrUrl: string) {
  const value = usernameOrUrl.trim();

  if (/^https?:\/\//i.test(value)) return value;

  switch (platform) {
    case "Instagram":
      return `https://www.instagram.com/${value.replace(/^@/, "")}`;
    case "TikTok":
      return `https://www.tiktok.com/@${value.replace(/^@/, "")}`;
    case "X":
      return `https://x.com/${value.replace(/^@/, "")}`;
    case "YouTube":
      return value.startsWith("@")
        ? `https://www.youtube.com/${value}`
        : `https://www.youtube.com/@${value.replace(/^@/, "")}`;
    case "Website":
      return value;
    default:
      return value;
  }
}

function inferPlatformFromMenuType(menuType: string) {
  if (menuType.startsWith("Instagram")) return "Instagram";
  if (menuType.startsWith("TikTok")) return "TikTok";
  if (menuType.startsWith("YouTube")) return "YouTube";
  if (menuType.startsWith("UGC")) return "UGC";
  if (menuType.includes("イベント")) return "Event";
  return "Other";
}

function inferMenuType(menuType: string) {
  const normalized = menuType.toLowerCase();

  if (inferPlatformFromMenuType(menuType) === "UGC") return "ugc";
  if (normalized.includes("story")) return "story";
  if (
    normalized.includes("short") ||
    normalized.includes("reel") ||
    normalized.includes("tiktok")
  ) {
    return "short_video";
  }
  if (normalized.includes("video")) return "video";
  return "post";
}

function buildReferencePriceText(price: number) {
  return `¥${price.toLocaleString()}〜`;
}

async function findExistingUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) return { user: null, error };

  const user =
    data.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    ) ?? null;

  return { user, error: null };
}

async function ensureNoDuplicateUsername(username: string, userId?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data && data.id !== userId) {
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const {
      auth_mode,
      access_token,
      username,
      full_name,
      email,
      password,
      avatar_url,
      portfolio_assets,
      country,
      prefecture,
      city,
      main_category,
      sub_categories,
      content_language,
      response_language,
      short_bio,
      is_adult_confirmed,
      phone_country_code,
      phone_number,
      phone_verified,
      social_accounts,
      first_menu,
      agreed_to_terms,
      agreed_to_privacy,
    } = body;

    const normalizedUsername = normalizeUsername(username ?? "");
    const normalizedSubCategories = Array.isArray(sub_categories)
      ? sub_categories.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      : [];

    if (!normalizedUsername) {
      return NextResponse.json(
        { error: "ユーザーネームを入力してください" },
        { status: 400 }
      );
    }

    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json(
        {
          error:
            "ユーザーネームは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です",
        },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return NextResponse.json(
        { error: "このユーザーネームは使用できません" },
        { status: 400 }
      );
    }

    if (!full_name?.trim()) {
      return NextResponse.json(
        { error: "氏名を入力してください" },
        { status: 400 }
      );
    }

    if (!avatar_url?.trim()) {
      return NextResponse.json(
        { error: "プロフィール画像を追加してください" },
        { status: 400 }
      );
    }

    const normalizedPortfolioAssets = Array.isArray(portfolio_assets)
      ? portfolio_assets
          .map((item, index) => ({
            asset_url: item.asset_url?.trim() ?? "",
            title: item.title?.trim() || null,
            sort_order: typeof item.sort_order === "number" ? item.sort_order : index,
          }))
          .filter((item) => item.asset_url.length > 0)
      : [];

    if (normalizedPortfolioAssets.length < 3) {
      return NextResponse.json(
        { error: "ポートフォリオ画像を3枚以上追加してください" },
        { status: 400 }
      );
    }

    if (!country?.trim() || !prefecture?.trim()) {
      return NextResponse.json(
        { error: "地域情報を入力してください" },
        { status: 400 }
      );
    }

    if (!main_category?.trim()) {
      return NextResponse.json(
        { error: "メインカテゴリを選択してください" },
        { status: 400 }
      );
    }

    if (!content_language?.trim() || !response_language?.trim()) {
      return NextResponse.json(
        { error: "発信言語と対応言語を選択してください" },
        { status: 400 }
      );
    }

    if (!is_adult_confirmed) {
      return NextResponse.json(
        { error: "18歳以上の確認が必要です" },
        { status: 400 }
      );
    }

    if (!phone_country_code?.trim() || !phone_number?.trim() || !phone_verified) {
      return NextResponse.json(
        { error: "電話番号の本人確認が必要です" },
        { status: 400 }
      );
    }

    if (!agreed_to_terms || !agreed_to_privacy) {
      return NextResponse.json(
        { error: "利用規約とプライバシーポリシーへの同意が必要です" },
        { status: 400 }
      );
    }

    if (!Array.isArray(social_accounts) || social_accounts.length === 0) {
      return NextResponse.json(
        { error: "SNSアカウントを少なくとも1件追加してください" },
        { status: 400 }
      );
    }

    const normalizedSocials = social_accounts.map((item) => ({
      platform: item.platform?.trim() ?? "",
      username_or_url: item.username_or_url?.trim() ?? "",
      follower_range: item.follower_range?.trim() ?? "",
      audience_country: item.audience_country?.trim() ?? "",
    }));

    const hasInvalidSocial = normalizedSocials.some(
      (item) =>
        !item.platform ||
        !item.username_or_url ||
        !item.follower_range ||
        !item.audience_country
    );

    if (hasInvalidSocial) {
      return NextResponse.json(
        { error: "SNSアカウント情報に未入力があります" },
        { status: 400 }
      );
    }

    if (!first_menu?.menu_type?.trim()) {
      return NextResponse.json(
        { error: "最初のメニュー種別を選択してください" },
        { status: 400 }
      );
    }

    if (!first_menu.price || Number(first_menu.price) <= 0) {
      return NextResponse.json(
        { error: "メニュー価格を入力してください" },
        { status: 400 }
      );
    }

    if (!first_menu.delivery_days || Number(first_menu.delivery_days) <= 0) {
      return NextResponse.json(
        { error: "納期を入力してください" },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let currentEmail = "";
    let currentUserMetadata: Record<string, unknown> = {};

    if (auth_mode === "email") {
      if (!email?.trim()) {
        return NextResponse.json(
          { error: "メールアドレスを入力してください" },
          { status: 400 }
        );
      }

      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "パスワードは8文字以上必要です" },
          { status: 400 }
        );
      }

      const { user: existingUser, error: listError } =
        await findExistingUserByEmail(email);

      if (listError) {
        return NextResponse.json(
          { error: "既存ユーザー確認に失敗しました" },
          { status: 500 }
        );
      }

      if (existingUser) {
        return NextResponse.json(
          { error: "既に登録済みのメールアドレスです" },
          { status: 400 }
        );
      }

      const duplicateOk = await ensureNoDuplicateUsername(normalizedUsername, null);

      if (!duplicateOk) {
        return NextResponse.json(
          { error: "このユーザーネームは既に使われています" },
          { status: 400 }
        );
      }

      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name.trim(),
            creator_username: normalizedUsername,
            creator_country: country.trim(),
            creator_prefecture: prefecture.trim(),
            creator_city: city?.trim() || null,
            creator_content_language: content_language.trim(),
            creator_response_language: response_language.trim(),
            creator_sub_categories: normalizedSubCategories,
            creator_phone: `${phone_country_code.trim()}${phone_number.trim()}`,
          },
        });

      if (createError || !createdUser?.user) {
        return NextResponse.json(
          { error: createError?.message ?? "ユーザー作成に失敗しました" },
          { status: 500 }
        );
      }

      userId = createdUser.user.id;
      currentEmail = createdUser.user.email ?? email.trim();
      currentUserMetadata = createdUser.user.user_metadata ?? {};
    } else {
      if (!access_token) {
        return NextResponse.json(
          { error: "OAuthアクセストークンが必要です" },
          { status: 400 }
        );
      }

      const {
        data: { user },
        error: getUserError,
      } = await supabaseAdmin.auth.getUser(access_token);

      if (getUserError || !user) {
        return NextResponse.json(
          { error: "OAuthユーザーの確認に失敗しました" },
          { status: 401 }
        );
      }

      userId = user.id;
      currentEmail = user.email ?? "";
      currentUserMetadata = user.user_metadata ?? {};

      const { data: existingCreator } = await supabaseAdmin
        .from("creators")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingCreator) {
        return NextResponse.json(
          { error: "このアカウントは既にクリエイター登録済みです" },
          { status: 400 }
        );
      }

      const duplicateOk = await ensureNoDuplicateUsername(normalizedUsername, userId);

      if (!duplicateOk) {
        return NextResponse.json(
          { error: "このユーザーネームは既に使われています" },
          { status: 400 }
        );
      }

      const { error: updateOAuthUserError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...currentUserMetadata,
            full_name: full_name.trim(),
            creator_username: normalizedUsername,
            creator_country: country.trim(),
            creator_prefecture: prefecture.trim(),
            creator_city: city?.trim() || null,
            creator_content_language: content_language.trim(),
            creator_response_language: response_language.trim(),
            creator_sub_categories: normalizedSubCategories,
            creator_phone: `${phone_country_code.trim()}${phone_number.trim()}`,
          },
        });

      if (updateOAuthUserError) {
        return NextResponse.json(
          {
            error:
              updateOAuthUserError.message ?? "OAuthユーザー更新に失敗しました",
          },
          { status: 500 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDを作成できませんでした" },
        { status: 500 }
      );
    }

    const phoneVerifiedAt = new Date().toISOString();

    const { data: createdCreator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .insert({
        user_id: userId,
        display_name: normalizedUsername,
        full_name: full_name.trim(),
        bio: short_bio?.trim() || null,
        category: main_category.trim(),
        country: country.trim(),
        prefecture: prefecture.trim(),
        city: city?.trim() || null,
        content_language: content_language.trim(),
        response_language: response_language.trim(),
        sub_categories: normalizedSubCategories,
        phone_country_code: phone_country_code.trim(),
        phone_number: phone_number.trim(),
        phone_verified_at: phoneVerifiedAt,
        approval_status: "approved",
        is_public: true,
        is_suspended: false,
        avatar_url: avatar_url.trim(),
        cover_image_url: null,
      })
      .select("id")
      .single();

    if (creatorError || !createdCreator) {
      return NextResponse.json(
        { error: creatorError?.message ?? "クリエイター作成に失敗しました" },
        { status: 500 }
      );
    }

    const creatorId = createdCreator.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      username: normalizedUsername,
      category: main_category.trim(),
      bio: short_bio?.trim() || null,
      avatar_url: avatar_url.trim(),
      is_public: true,
      onboarding_completed: true,
      public_profile_completed: true,
    });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message ?? "プロフィール作成に失敗しました" },
        { status: 500 }
      );
    }

    const portfolioRows = normalizedPortfolioAssets.map((asset, index) => ({
      creator_id: creatorId,
      asset_url: asset.asset_url,
      asset_type: "image",
      title: asset.title,
      sort_order: asset.sort_order ?? index,
      is_public: true,
    }));

    const { error: portfolioError } = await supabaseAdmin
      .from("creator_portfolio_assets")
      .insert(portfolioRows);

    if (portfolioError) {
      return NextResponse.json(
        { error: portfolioError.message ?? "ポートフォリオ画像の保存に失敗しました" },
        { status: 500 }
      );
    }

    const socialRows = normalizedSocials.map((item) => ({
      creator_id: creatorId,
      platform: item.platform,
      url: buildSocialUrl(item.platform, item.username_or_url),
      follower_range: item.follower_range,
      audience_country: item.audience_country,
    }));

    const { error: socialError } = await supabaseAdmin
      .from("creator_social_accounts")
      .insert(socialRows);

    if (socialError) {
      return NextResponse.json(
        { error: socialError.message ?? "SNS情報の保存に失敗しました" },
        { status: 500 }
      );
    }

    const menuType = first_menu.menu_type.trim();
    const menuPrice = Number(first_menu.price);
    const deliveryDays = Number(first_menu.delivery_days);

    const { error: menuError } = await supabaseAdmin
      .from("creator_menus")
      .insert({
        creator_id: creatorId,
        title: menuType,
        description: first_menu.description?.trim() || null,
        platform: inferPlatformFromMenuType(menuType),
        sns: inferPlatformFromMenuType(menuType),
        price: menuPrice,
        currency: "JPY",
        delivery_days: deliveryDays,
        deliverables: menuType,
        is_active: true,
        notes: null,
        account_url: socialRows[0]?.url ?? null,
        reference_price_text: null,
        allow_secondary_use: !!first_menu.allow_secondary_use,
        category: main_category.trim(),
        menu_type: inferMenuType(menuType),
        sort_order: 0,
      });

    if (menuError) {
      return NextResponse.json(
        { error: menuError.message ?? "最初のメニュー作成に失敗しました" },
        { status: 500 }
      );
    }

    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "creator")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "creator",
      });

      if (roleError) {
        return NextResponse.json(
          { error: roleError.message ?? "ロール作成に失敗しました" },
          { status: 500 }
        );
      }
    }

    const now = new Date().toISOString();

    const { data: existingState } = await supabaseAdmin
      .from("user_states")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingState) {
      const { error: stateUpdateError } = await supabaseAdmin
        .from("user_states")
        .update({
          creator_profile_completed: true,
          onboarding_completed: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          terms_agreed_at: now,
          privacy_agreed_at: now,
          updated_at: now,
        })
        .eq("user_id", userId);

      if (stateUpdateError) {
        return NextResponse.json(
          { error: stateUpdateError.message ?? "ユーザー状態の保存に失敗しました" },
          { status: 500 }
        );
      }
    } else {
      const { error: stateInsertError } = await supabaseAdmin
        .from("user_states")
        .insert({
          user_id: userId,
          creator_profile_completed: true,
          company_profile_completed: false,
          onboarding_completed: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          terms_agreed_at: now,
          privacy_agreed_at: now,
          updated_at: now,
        });

      if (stateInsertError) {
        return NextResponse.json(
          { error: stateInsertError.message ?? "ユーザー状態の保存に失敗しました" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      creator_id: creatorId,
      email: currentEmail,
      metadata: currentUserMetadata,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "internal error",
      },
      { status: 500 }
    );
  }
}