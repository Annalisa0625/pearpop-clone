// app/api/signup/complete-creator/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SocialAccountInput = {
  platform: string;
  username_or_url: string;
  follower_range: string;
  audience_country: string;
};

type MenuInput = {
  menu_type: string;
  price: number;
  description?: string | null;
};

type LegacyFirstMenuInput = {
  menu_type: string;
  price: number;
  delivery_days?: number;
  description?: string | null;
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
  display_name?: string;
  full_name?: string;
  email?: string;
  password?: string;

  avatar_url?: string | null;
  portfolio_assets?: PortfolioAssetInput[];

  gender?: string | null;
  birth_date?: string | null;

  country?: string | null;
  prefecture?: string | null;
  city?: string | null;
  can_receive_products?: boolean | null;

  main_category: string;
  sub_categories?: string[];
  content_language?: string | null;
  response_language?: string | null;
  short_bio?: string | null;
  is_adult_confirmed?: boolean;

  phone_country_code?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean | null;

  social_accounts: SocialAccountInput[];

  first_menus?: MenuInput[];
  first_menu?: LegacyFirstMenuInput;

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

const VALID_GENDERS = new Set(["男性", "女性", "その他"]);

function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

function isValidUsername(input: string) {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(input);
}

function normalizeSocialHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function buildSocialUrl(platform: string, usernameOrUrl: string) {
  const value = usernameOrUrl.trim();

  if (/^https?:\/\//i.test(value)) return value;

  const handle = normalizeSocialHandle(value);

  switch (platform) {
    case "Instagram":
      return `https://www.instagram.com/${handle}`;
    case "TikTok":
      return `https://www.tiktok.com/@${handle}`;
    case "X":
      return `https://x.com/${handle}`;
    case "YouTube":
      return `https://www.youtube.com/@${handle}`;
    case "Website":
      return value;
    default:
      return value;
  }
}

function inferPlatformFromMenuType(menuType: string) {
  if (menuType.includes("Instagram")) return "Instagram";
  if (menuType.includes("TikTok")) return "TikTok";
  if (menuType.includes("YouTube")) return "YouTube";

  if (
    menuType.includes("投稿なし") ||
    menuType.includes("素材のみ") ||
    menuType.toLowerCase().includes("ugc")
  ) {
    return "UGC";
  }

  if (menuType.includes("イベント")) return "Event";

  return "Other";
}

function inferMenuType(menuType: string) {
  const normalized = menuType.toLowerCase();

  if (menuType.includes("投稿なし") && menuType.includes("動画")) {
    return "ugc_video";
  }

  if (menuType.includes("投稿なし") && menuType.includes("写真")) {
    return "ugc_photo";
  }

  if (inferPlatformFromMenuType(menuType) === "UGC") return "ugc";
  if (normalized.includes("story")) return "story";

  if (
    normalized.includes("short") ||
    normalized.includes("reel") ||
    normalized.includes("tiktok")
  ) {
    return "short_video";
  }

  if (normalized.includes("video") || menuType.includes("動画")) {
    return "video";
  }

  return "post";
}

function isMaterialOnlyMenu(menuType: string) {
  return (
    menuType.includes("投稿なし") ||
    menuType.includes("素材のみ") ||
    inferPlatformFromMenuType(menuType) === "UGC"
  );
}

function normalizeBirthDate(input?: string | null) {
  const value = input?.trim();

  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;

  return value;
}

function getAgeFromBirthDate(birthDate: string) {
  const today = new Date();
  const birthday = new Date(`${birthDate}T00:00:00.000Z`);

  let age = today.getUTCFullYear() - birthday.getUTCFullYear();

  const currentMonth = today.getUTCMonth();
  const birthMonth = birthday.getUTCMonth();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && today.getUTCDate() < birthday.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
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

async function ensureNoDuplicateUsername(
  username: string,
  userId?: string | null
) {
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

function normalizeMenus(body: RequestBody) {
  if (Array.isArray(body.first_menus) && body.first_menus.length > 0) {
    return body.first_menus
      .map((menu) => ({
        menu_type: menu.menu_type?.trim() ?? "",
        price: Number(menu.price),
        description: menu.description?.trim() || null,
      }))
      .filter((menu) => menu.menu_type || Number.isFinite(menu.price));
  }

  if (body.first_menu) {
    return [
      {
        menu_type: body.first_menu.menu_type?.trim() ?? "",
        price: Number(body.first_menu.price),
        description: body.first_menu.description?.trim() || null,
      },
    ];
  }

  return [];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const {
      auth_mode,
      access_token,
      username,
      display_name,
      full_name,
      email,
      password,
      avatar_url,
      portfolio_assets,
      gender,
      birth_date,
      country,
      prefecture,
      main_category,
      sub_categories,
      short_bio,
      social_accounts,
      agreed_to_terms,
      agreed_to_privacy,
    } = body;

    const normalizedUsername = normalizeUsername(username ?? "");

    const normalizedDisplayName =
      display_name?.trim() || full_name?.trim() || normalizedUsername;

    const normalizedFullName = full_name?.trim() || normalizedDisplayName;

    const normalizedCountry = country?.trim() || "日本";
    const normalizedPrefecture = prefecture?.trim() || null;
    const normalizedContentLanguage =
      body.content_language?.trim() || "日本語";
    const normalizedResponseLanguage =
      body.response_language?.trim() || "日本語";

    const normalizedGender = gender?.trim() || null;
    const normalizedBirthDate = normalizeBirthDate(birth_date);
    const normalizedCanReceiveProducts = Boolean(body.can_receive_products);

    const normalizedSubCategories = Array.isArray(sub_categories)
      ? sub_categories
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
          .map((item) => item.trim())
          .slice(0, 5)
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

    if (!normalizedDisplayName) {
      return NextResponse.json(
        { error: "ユーザーネームを入力してください" },
        { status: 400 }
      );
    }

    if (!normalizedGender || !VALID_GENDERS.has(normalizedGender)) {
      return NextResponse.json(
        { error: "性別を選択してください" },
        { status: 400 }
      );
    }

    if (!normalizedBirthDate) {
      return NextResponse.json(
        { error: "生年月日を選択してください" },
        { status: 400 }
      );
    }

    if (getAgeFromBirthDate(normalizedBirthDate) < 18) {
      return NextResponse.json(
        { error: "18歳以上の方のみ登録できます" },
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
            sort_order:
              typeof item.sort_order === "number" ? item.sort_order : index,
          }))
          .filter((item) => item.asset_url.length > 0)
      : [];

    if (normalizedPortfolioAssets.length < 3) {
      return NextResponse.json(
        { error: "ポートフォリオ画像を3枚以上追加してください" },
        { status: 400 }
      );
    }

    if (normalizedSubCategories.length === 0) {
      return NextResponse.json(
        { error: "得意または興味のあるジャンルを選択してください" },
        { status: 400 }
      );
    }

    if (normalizedSubCategories.length > 5) {
      return NextResponse.json(
        { error: "ジャンルは5つまで選択できます" },
        { status: 400 }
      );
    }

    const normalizedMainCategory =
      main_category?.trim() || normalizedSubCategories[0] || "";

    if (!normalizedMainCategory) {
      return NextResponse.json(
        { error: "ジャンルを選択してください" },
        { status: 400 }
      );
    }

    if (!normalizedCountry) {
      return NextResponse.json(
        { error: "国を選択してください" },
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

    const normalizedMenus = normalizeMenus(body);

    if (normalizedMenus.length === 0) {
      return NextResponse.json(
        { error: "メニューを少なくとも1つ追加してください" },
        { status: 400 }
      );
    }

    const invalidMenu = normalizedMenus.some(
      (menu) =>
        !menu.menu_type ||
        !Number.isFinite(menu.price) ||
        Number(menu.price) <= 0
    );

    if (invalidMenu) {
      return NextResponse.json(
        { error: "メニュー種別と価格を正しく入力してください" },
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

      const duplicateOk = await ensureNoDuplicateUsername(
        normalizedUsername,
        null
      );

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
            full_name: normalizedFullName,
            display_name: normalizedDisplayName,
            creator_username: normalizedUsername,
            creator_gender: normalizedGender,
            creator_birth_date: normalizedBirthDate,
            creator_country: normalizedCountry,
            creator_prefecture: normalizedPrefecture,
            creator_can_receive_products: normalizedCanReceiveProducts,
            creator_content_language: normalizedContentLanguage,
            creator_response_language: normalizedResponseLanguage,
            creator_sub_categories: normalizedSubCategories,
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
          { error: "このアカウントは既にインフルエンサー登録済みです" },
          { status: 400 }
        );
      }

      const duplicateOk = await ensureNoDuplicateUsername(
        normalizedUsername,
        userId
      );

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
            full_name: normalizedFullName,
            display_name: normalizedDisplayName,
            creator_username: normalizedUsername,
            creator_gender: normalizedGender,
            creator_birth_date: normalizedBirthDate,
            creator_country: normalizedCountry,
            creator_prefecture: normalizedPrefecture,
            creator_can_receive_products: normalizedCanReceiveProducts,
            creator_content_language: normalizedContentLanguage,
            creator_response_language: normalizedResponseLanguage,
            creator_sub_categories: normalizedSubCategories,
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

    const { data: createdCreator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .insert({
        user_id: userId,
        contact_email: currentEmail || email?.trim() || null,
        display_name: normalizedDisplayName,
        full_name: normalizedFullName,
        gender: normalizedGender,
        birth_date: normalizedBirthDate,
        bio: short_bio?.trim() || null,
        category: normalizedMainCategory,
        country: normalizedCountry,
        prefecture: normalizedPrefecture,
        city: null,
        can_receive_products: normalizedCanReceiveProducts,
        content_language: normalizedContentLanguage,
        response_language: normalizedResponseLanguage,
        sub_categories: normalizedSubCategories,
        phone_country_code: null,
        phone_number: null,
        phone_verified_at: null,
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
        { error: creatorError?.message ?? "インフルエンサー作成に失敗しました" },
        { status: 500 }
      );
    }

    const creatorId = createdCreator.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      username: normalizedUsername,
      category: normalizedMainCategory,
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
      handle: normalizeSocialHandle(item.username_or_url),
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

    const menuRows = normalizedMenus.map((menu, index) => {
      const menuType = menu.menu_type.trim();
      const platform = inferPlatformFromMenuType(menuType);
      const menuPrice = Number(menu.price);
      const matchingSocial =
        socialRows.find((social) => social.platform === platform)?.url ??
        socialRows[0]?.url ??
        null;

      return {
        creator_id: creatorId,
        title: menuType,
        description: menu.description || null,
        platform,
        sns: platform,
        price: menuPrice,
        currency: "JPY",
        delivery_days: 7,
        deliverables: menuType,
        is_active: true,
        notes: null,
        account_url: matchingSocial,
        reference_price_text: null,
        allow_secondary_use: isMaterialOnlyMenu(menuType),
        category: normalizedMainCategory,
        menu_type: inferMenuType(menuType),
        sort_order: index,
      };
    });

    const { error: menuError } = await supabaseAdmin
      .from("creator_menus")
      .insert(menuRows);

    if (menuError) {
      return NextResponse.json(
        { error: menuError.message ?? "メニュー作成に失敗しました" },
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
        error: error instanceof Error ? error.message : "internal error",
      },
      { status: 500 }
    );
  }
}