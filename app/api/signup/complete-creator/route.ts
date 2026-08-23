import { NextResponse } from "next/server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/release";
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
  username: string;
  display_name?: string;
  full_name?: string;
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
  social_accounts: SocialAccountInput[];
  first_menus?: MenuInput[];
  first_menu?: LegacyFirstMenuInput;
  agreed_to_terms?: boolean;
  agreed_to_privacy?: boolean;
};

const RESERVED_USERNAMES = new Set([
  "admin", "api", "login", "signup", "creator", "company", "dashboard",
  "home", "privacy", "terms", "legal",
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

function normalizeHttpUrl(input: string, allowBareHost = false) {
  const value = input.trim();
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);

  if (!value || value.startsWith("//") || value.startsWith("\\")) {
    throw new Error("SNS URLはhttpまたはhttpsで入力してください");
  }
  if (hasScheme && !/^https?:/i.test(value)) {
    throw new Error("SNS URLはhttpまたはhttpsで入力してください");
  }

  try {
    const url = new URL(hasScheme ? value : allowBareHost ? `https://${value}` : value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsafe scheme");
    }
    return url.toString();
  } catch {
    throw new Error("SNS URLは有効なhttpまたはhttps URLで入力してください");
  }
}

function buildSocialUrl(platform: string, usernameOrUrl: string) {
  const value = usernameOrUrl.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return normalizeHttpUrl(value);
  if (platform === "Website") return normalizeHttpUrl(value, true);
  const handle = normalizeSocialHandle(value);
  switch (platform) {
    case "Instagram": return `https://www.instagram.com/${handle}`;
    case "TikTok": return `https://www.tiktok.com/@${handle}`;
    case "X": return `https://x.com/${handle}`;
    case "YouTube": return `https://www.youtube.com/@${handle}`;
    default: return normalizeHttpUrl(value, true);
  }
}

function inferPlatformFromMenuType(menuType: string) {
  if (menuType.includes("Instagram")) return "Instagram";
  if (menuType.includes("TikTok")) return "TikTok";
  if (menuType.includes("YouTube")) return "YouTube";
  if (menuType.includes("投稿なし") || menuType.includes("素材のみ") || menuType.toLowerCase().includes("ugc")) return "UGC";
  if (menuType.includes("イベント")) return "Event";
  return "Other";
}

function inferMenuType(menuType: string) {
  const normalized = menuType.toLowerCase();
  if (menuType.includes("投稿なし") && menuType.includes("動画")) return "ugc_video";
  if (menuType.includes("投稿なし") && menuType.includes("写真")) return "ugc_photo";
  if (inferPlatformFromMenuType(menuType) === "UGC") return "ugc";
  if (normalized.includes("story")) return "story";
  if (normalized.includes("short") || normalized.includes("reel") || normalized.includes("tiktok")) return "short_video";
  if (normalized.includes("video") || menuType.includes("動画")) return "video";
  return "post";
}

function isMaterialOnlyMenu(menuType: string) {
  return menuType.includes("投稿なし") || menuType.includes("素材のみ") || inferPlatformFromMenuType(menuType) === "UGC";
}

function normalizeBirthDate(input?: string | null) {
  const value = input?.trim();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) ? null : value;
}

function getAgeFromBirthDate(birthDate: string) {
  const today = new Date();
  const birthday = new Date(`${birthDate}T00:00:00.000Z`);
  let age = today.getUTCFullYear() - birthday.getUTCFullYear();
  if (today.getUTCMonth() < birthday.getUTCMonth() || (today.getUTCMonth() === birthday.getUTCMonth() && today.getUTCDate() < birthday.getUTCDate())) age -= 1;
  return age;
}

function normalizeMenus(body: RequestBody) {
  const source = Array.isArray(body.first_menus) && body.first_menus.length > 0
    ? body.first_menus
    : body.first_menu ? [body.first_menu] : [];
  return source
    .map((menu) => ({
      menu_type: menu.menu_type?.trim() ?? "",
      price: Number(menu.price),
      description: menu.description?.trim() || null,
    }))
    .filter((menu) => menu.menu_type || Number.isFinite(menu.price));
}

function errorResponse(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const normalizedUsername = normalizeUsername(body.username ?? "");
    const normalizedDisplayName = body.display_name?.trim() || body.full_name?.trim() || normalizedUsername;
    const normalizedFullName = body.full_name?.trim() || normalizedDisplayName;
    const normalizedCountry = body.country?.trim() || "日本";
    const normalizedPrefecture = body.prefecture?.trim() || null;
    const normalizedContentLanguage = body.content_language?.trim() || "日本語";
    const normalizedResponseLanguage = body.response_language?.trim() || "日本語";
    const normalizedGender = body.gender?.trim() || null;
    const normalizedBirthDate = normalizeBirthDate(body.birth_date);
    const normalizedCanReceiveProducts = Boolean(body.can_receive_products);
    const normalizedSubCategories = Array.isArray(body.sub_categories)
      ? body.sub_categories.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 5)
      : [];

    if (!normalizedUsername) return errorResponse("ユーザーネームを入力してください", 400);
    if (!isValidUsername(normalizedUsername)) return errorResponse("ユーザーネームは英小文字・数字・アンダースコア・ハイフンのみで3〜30文字です", 400);
    if (RESERVED_USERNAMES.has(normalizedUsername)) return errorResponse("このユーザーネームは使用できません", 400);
    if (!normalizedDisplayName) return errorResponse("ユーザーネームを入力してください", 400);
    if (!normalizedGender || !VALID_GENDERS.has(normalizedGender)) return errorResponse("性別を選択してください", 400);
    if (!normalizedBirthDate) return errorResponse("生年月日を選択してください", 400);
    if (getAgeFromBirthDate(normalizedBirthDate) < 18) return errorResponse("18歳以上の方のみ登録できます", 400);
    const avatarUrl = body.avatar_url?.trim() ?? "";
    if (!avatarUrl) return errorResponse("プロフィール画像を追加してください", 400);

    const portfolioAssets = Array.isArray(body.portfolio_assets)
      ? body.portfolio_assets.map((item, index) => ({ asset_url: item.asset_url?.trim() ?? "", title: item.title?.trim() || null, sort_order: typeof item.sort_order === "number" ? item.sort_order : index })).filter((item) => item.asset_url.length > 0)
      : [];
    if (portfolioAssets.length < 3) return errorResponse("ポートフォリオ画像を3枚以上追加してください", 400);
    if (normalizedSubCategories.length === 0) return errorResponse("得意または興味のあるジャンルを選択してください", 400);
    if (normalizedSubCategories.length > 5) return errorResponse("ジャンルは5つまで選択できます", 400);
    const normalizedMainCategory = body.main_category?.trim() || normalizedSubCategories[0] || "";
    if (!normalizedMainCategory) return errorResponse("ジャンルを選択してください", 400);
    if (!normalizedCountry) return errorResponse("国を選択してください", 400);
    if (!body.agreed_to_terms || !body.agreed_to_privacy) return errorResponse("利用規約とプライバシーポリシーへの同意が必要です", 400);

    if (!Array.isArray(body.social_accounts) || body.social_accounts.length === 0) return errorResponse("SNSアカウントを少なくとも1件追加してください", 400);
    const normalizedSocials = body.social_accounts.map((item) => ({
      platform: item.platform?.trim() ?? "",
      username_or_url: item.username_or_url?.trim() ?? "",
      follower_range: item.follower_range?.trim() ?? "",
      audience_country: item.audience_country?.trim() ?? "",
    }));
    if (normalizedSocials.some((item) => !item.platform || !item.username_or_url || !item.follower_range || !item.audience_country)) return errorResponse("SNSアカウント情報に未入力があります", 400);
    let socialRows: { platform: string; url: string; handle: string; follower_range: string; audience_country: string }[];
    try {
      socialRows = normalizedSocials.map((item) => ({
        platform: item.platform,
        url: buildSocialUrl(item.platform, item.username_or_url),
        handle: normalizeSocialHandle(item.username_or_url),
        follower_range: item.follower_range,
        audience_country: item.audience_country,
      }));
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "SNS URLを確認してください", 400);
    }

    const normalizedMenus = normalizeMenus(body);
    if (normalizedMenus.length === 0) return errorResponse("メニューを少なくとも1つ追加してください", 400);
    if (normalizedMenus.some((menu) => !menu.menu_type || !Number.isFinite(menu.price) || menu.price <= 0)) return errorResponse("メニュー種別と価格を正しく入力してください", 400);

    const authorization = req.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!accessToken) return errorResponse("認証トークンが必要です", 401);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData.user) return errorResponse("認証ユーザーの確認に失敗しました", 401);

    const userId = authData.user.id;
    const currentEmail = authData.user.email ?? "";
    const currentUserMetadata = authData.user.user_metadata ?? {};
    const menuRows = normalizedMenus.map((menu, index) => {
      const platform = inferPlatformFromMenuType(menu.menu_type);
      return {
        title: menu.menu_type,
        description: menu.description,
        platform,
        sns: platform,
        price: menu.price,
        currency: "JPY",
        delivery_days: 7,
        deliverables: menu.menu_type,
        is_active: true,
        notes: null,
        account_url: socialRows.find((social) => social.platform === platform)?.url ?? socialRows[0]?.url ?? null,
        reference_price_text: null,
        allow_secondary_use: isMaterialOnlyMenu(menu.menu_type),
        category: normalizedMainCategory,
        menu_type: inferMenuType(menu.menu_type),
        sort_order: index,
      };
    });

    const agreedAt = new Date().toISOString();
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("complete_creator_signup", {
      p_user_id: userId,
      p_payload: {
        contact_email: currentEmail,
        username: normalizedUsername,
        display_name: normalizedDisplayName,
        full_name: normalizedFullName,
        gender: normalizedGender,
        birth_date: normalizedBirthDate,
        bio: body.short_bio?.trim() || "",
        category: normalizedMainCategory,
        country: normalizedCountry,
        prefecture: normalizedPrefecture ?? "",
        can_receive_products: normalizedCanReceiveProducts,
        content_language: normalizedContentLanguage,
        response_language: normalizedResponseLanguage,
        sub_categories: normalizedSubCategories,
        avatar_url: avatarUrl,
        portfolio_assets: portfolioAssets,
        social_accounts: socialRows,
        menus: menuRows,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        agreed_at: agreedAt,
      },
    });

    if (rpcError) return errorResponse(rpcError.message ?? "プロフィール作成に失敗しました", 500);
    const result = rpcData?.[0];
    if (!result) return errorResponse("プロフィール作成の結果を確認できませんでした", 500);
    if (result.status === "company_conflict") {
      return errorResponse(
        "このメールアドレスは企業アカウントに登録されています。Creator登録には別のアカウントを使用してください。",
        409,
        "COMPANY_ACCOUNT_CONFLICT"
      );
    }
    if (result.status === "username_conflict") {
      return errorResponse(
        "このユーザー名は既に使用されています。別のユーザー名を選択してください。",
        400,
        "USERNAME_CONFLICT"
      );
    }
    if (result.status === "already_completed") {
      return NextResponse.json({ success: true, status: "already_completed", creator_id: result.creator_id });
    }
    if (result.status !== "completed_now" || !result.creator_id) return errorResponse("プロフィール作成に失敗しました", 500);

    // Auth metadata is derived. It is intentionally updated only after the
    // atomic application-data completion wins, so a concurrent loser cannot
    // overwrite the completed Creator's identity metadata.
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
    if (metadataError) console.error("creator signup metadata update failed", metadataError);

    return NextResponse.json({
      success: true,
      status: "completed_now",
      creator_id: result.creator_id,
      metadata_updated: !metadataError,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : "internal error", 500);
  }
}
