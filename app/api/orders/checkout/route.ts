// File: app/api/orders/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBaseUrl, getStripe } from "@/lib/stripe";
import {
  calculateOrderFees,
  normalizeInternalPlanCode,
} from "@/lib/orders/fees";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProjectType = "visit_experience" | "product_delivery" | "provided_assets";

type ReferenceAssetInput = {
  storage_path?: unknown;
  file_name?: unknown;
  file_type?: unknown;
  mime_type?: unknown;
  size_bytes?: unknown;
  sort_order?: unknown;
};

type NormalizedReferenceAsset = {
  storage_path: string;
  file_name: string;
  file_type: "image" | "pdf";
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};

type CheckoutBody = {
  creator_id?: string;
  creator_menu_id?: string;
  project_type?: string;
  product_name?: string;
  product_url?: string;
  deadline?: string;
  requirements?: string;
  note?: string;
  has_free_offer?: boolean;
  wants_secondary_use?: boolean;

  pr_account?: string;
  pr_hashtags?: string[];
  post_notes?: string;

  reference_assets?: ReferenceAssetInput[];
};

const ORDER_REFERENCE_ASSETS_BUCKET = "order-reference-assets";

const MAX_REFERENCE_ASSETS = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const AUTH_TIMEOUT_MS = 8000;
const DB_TIMEOUT_MS = 10000;
const DB_OPTIONAL_TIMEOUT_MS = 3000;
const STRIPE_TIMEOUT_MS = 12000;
const STRIPE_SESSION_TIMEOUT_MS = 20000;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_PDF_MIME_TYPES = new Set(["application/pdf"]);

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return { user: null, error: "認証トークンがありません" };
  }

  const {
    data: { user },
    error,
  } = await withTimeout(
    supabaseAdmin.auth.getUser(token),
    AUTH_TIMEOUT_MS,
    "認証情報の確認に時間がかかっています"
  );

  if (error || !user) {
    return { user: null, error: "認証に失敗しました" };
  }

  return { user, error: null };
}

async function ensureCompanyUser(userId: string) {
  const { data, error } = await withTimeout(
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "company")
      .maybeSingle(),
    DB_TIMEOUT_MS,
    "企業ロールの確認に時間がかかっています"
  );

  if (error || !data) {
    return false;
  }

  return true;
}

async function ensureNoActiveSuspension(userId: string) {
  const { data, error } = await withTimeout(
    supabaseAdmin
      .from("user_suspensions")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1),
    DB_TIMEOUT_MS,
    "アカウント状態の確認に時間がかかっています"
  );

  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}

async function getCompany(userId: string) {
  const { data, error } = await withTimeout(
    supabaseAdmin
      .from("companies")
      .select("company_name, contact_email, approval_status")
      .eq("user_id", userId)
      .maybeSingle(),
    DB_TIMEOUT_MS,
    "企業情報の取得に時間がかかっています"
  );

  if (error) {
    throw error;
  }

  return data;
}

async function getUserState(userId: string) {
  const { data, error } = await withTimeout(
    supabaseAdmin
      .from("user_states")
      .select(
        `
        user_id,
        company_profile_completed,
        company_access_status,
        company_plan_code,
        company_subscription_status,
        monthly_request_limit,
        monthly_request_used,
        request_usage_reset_at,
        stripe_customer_id
      `
      )
      .eq("user_id", userId)
      .maybeSingle(),
    DB_TIMEOUT_MS,
    "利用状態の取得に時間がかかっています"
  );

  if (error) {
    throw error;
  }

  return data;
}

async function upsertUserState(
  userId: string,
  patch: Record<string, string | number | boolean | null>
) {
  const { error } = await withTimeout(
    supabaseAdmin.from("user_states").upsert(
      {
        user_id: userId,
        ...patch,
      },
      {
        onConflict: "user_id",
      }
    ),
    DB_TIMEOUT_MS,
    "利用状態の更新に時間がかかっています"
  );

  if (error) {
    throw error;
  }
}

async function findOrCreateStripeCustomer(args: {
  userId: string;
  email: string;
  companyName?: string | null;
  existingCustomerId?: string | null;
}) {
  const stripe = getStripe();

  if (args.existingCustomerId) {
    try {
      const existingCustomer = await withTimeout(
        stripe.customers.retrieve(args.existingCustomerId),
        STRIPE_TIMEOUT_MS,
        "Stripe顧客情報の確認に時間がかかっています"
      );

      if (!("deleted" in existingCustomer)) {
        const metadataUserId =
          existingCustomer.metadata?.supabase_user_id ?? null;

        if (!metadataUserId || metadataUserId === args.userId) {
          return existingCustomer;
        }
      }
    } catch (error) {
      console.warn("stripe existing customer lookup skipped", error);
    }
  }

  try {
    const byEmail = await withTimeout(
      stripe.customers.list({
        email: args.email,
        limit: 20,
      }),
      STRIPE_TIMEOUT_MS,
      "Stripe顧客情報の検索に時間がかかっています"
    );

    const matchedByMetadata =
      byEmail.data.find(
        (customer) => customer.metadata?.supabase_user_id === args.userId
      ) ?? null;

    if (matchedByMetadata) {
      return matchedByMetadata;
    }
  } catch (error) {
    console.warn("stripe customer email lookup skipped", error);
  }

  return withTimeout(
    stripe.customers.create({
      email: args.email,
      name: args.companyName ?? args.email,
      metadata: {
        supabase_user_id: args.userId,
      },
    }),
    STRIPE_TIMEOUT_MS,
    "Stripe顧客情報の作成に時間がかかっています"
  );
}

function normalizeCurrency(value: string | null | undefined) {
  const normalized = (value ?? "JPY").trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return "JPY";
  }

  return normalized;
}

function toStripeAmount(amount: number, currency: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const text = getString(value);
  return text ? text : null;
}

function getBoolean(value: unknown) {
  return value === true;
}

function getInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function normalizeProjectType(value: unknown): ProjectType | null {
  if (value === "visit_experience") return "visit_experience";
  if (value === "product_delivery") return "product_delivery";
  if (value === "provided_assets") return "provided_assets";
  return null;
}

function isUgcMenuSnapshot(menu: {
  menu_type?: string | null;
  category?: string | null;
  platform?: string | null;
  sns?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const text = [
    menu.menu_type,
    menu.category,
    menu.platform,
    menu.sns,
    menu.title,
    menu.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("ugc") ||
    text.includes("素材") ||
    text.includes("動画素材") ||
    text.includes("画像素材")
  );
}

function isDateStringOrNull(value: string | null) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPaidPlan(planCode: string | null | undefined) {
  const normalized = normalizeInternalPlanCode(planCode);
  return normalized === "standard" || normalized === "global_pro";
}

function normalizePrAccount(value: unknown) {
  const text = getString(value)
    .replace(/^[@＠]+/g, "")
    .replace(/\s+/g, "");

  return text || null;
}

function normalizeHashtag(value: unknown) {
  const text = getString(value)
    .replace(/^[#＃]+/g, "")
    .replace(/\s+/g, "");

  if (!text) return null;

  const lower = text.toLowerCase();

  if (lower === "pr" || lower === "ad" || lower === "sponsored") {
    return null;
  }

  return text;
}

function normalizeHashtags(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const normalized = normalizeHashtag(item);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);

    if (result.length >= 8) break;
  }

  return result;
}

function buildPrCopyText(args: {
  prAccount: string | null;
  prHashtags: string[];
}) {
  const lines: string[] = [];

  if (args.prAccount) {
    lines.push(`PR@${args.prAccount}`);
  }

  if (args.prHashtags.length > 0) {
    lines.push(args.prHashtags.map((tag) => `#${tag}`).join(" "));
  }

  return lines.join("\n");
}

function normalizeReferenceAssets(value: unknown, userId: string) {
  if (!Array.isArray(value)) return { assets: [], error: null };

  if (value.length > MAX_REFERENCE_ASSETS) {
    return {
      assets: [],
      error: `参考資料は最大${MAX_REFERENCE_ASSETS}ファイルまで添付できます`,
    };
  }

  const result: NormalizedReferenceAsset[] = [];
  const seenPaths = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index] as ReferenceAssetInput;

    const storagePath = getString(item?.storage_path);
    const fileName = getString(item?.file_name);
    const fileType = getString(item?.file_type);
    const mimeType = getString(item?.mime_type).toLowerCase();
    const sizeBytes = getInteger(item?.size_bytes);
    const sortOrder = getInteger(item?.sort_order) ?? index;

    if (!storagePath || !fileName || !fileType || !mimeType || !sizeBytes) {
      return {
        assets: [],
        error: "参考資料の情報が不足しています",
      };
    }

    const expectedPrefix = `order-drafts/${userId}/`;

    if (!storagePath.startsWith(expectedPrefix)) {
      return {
        assets: [],
        error: "参考資料の保存場所が正しくありません",
      };
    }

    if (seenPaths.has(storagePath)) {
      return {
        assets: [],
        error: "同じ参考資料が重複しています",
      };
    }

    seenPaths.add(storagePath);

    if (fileType !== "image" && fileType !== "pdf") {
      return {
        assets: [],
        error: "参考資料は画像またはPDFのみ添付できます",
      };
    }

    if (fileType === "image") {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return {
          assets: [],
          error: "画像はJPG、PNG、WebPのみ添付できます",
        };
      }

      if (sizeBytes > MAX_IMAGE_BYTES) {
        return {
          assets: [],
          error: "画像は1ファイル5MBまでです",
        };
      }
    }

    if (fileType === "pdf") {
      if (!ALLOWED_PDF_MIME_TYPES.has(mimeType)) {
        return {
          assets: [],
          error: "PDFファイルのみ添付できます",
        };
      }

      if (sizeBytes > MAX_PDF_BYTES) {
        return {
          assets: [],
          error: "PDFは1ファイル10MBまでです",
        };
      }
    }

    result.push({
      storage_path: storagePath,
      file_name: fileName.slice(0, 180),
      file_type: fileType,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      sort_order: sortOrder,
    });
  }

  return { assets: result, error: null };
}

async function safeInsertOrderEvent(args: {
  orderId: string;
  actorUserId: string | null;
  eventType: string;
  eventData: Record<string, unknown>;
}) {
  try {
    const eventRow = {
      order_id: args.orderId,
      actor_user_id: args.actorUserId,
      event_type: args.eventType,
      event_data: args.eventData,
    } as never;

    await withTimeout(
      supabaseAdmin.from("order_events").insert(eventRow),
      DB_OPTIONAL_TIMEOUT_MS,
      "order event insert timeout"
    );
  } catch (error) {
    console.warn("order event insert skipped", error);
  }
}

async function safePersistReferenceAssets(args: {
  orderId: string;
  bUserId: string;
  creatorUserId: string;
  referenceAssets: NormalizedReferenceAsset[];
}) {
  if (args.referenceAssets.length === 0) return;

  try {
    const assetRows = args.referenceAssets.map((asset) => ({
      order_id: args.orderId,
      b_user_id: args.bUserId,
      creator_user_id: args.creatorUserId,
      uploaded_by_user_id: args.bUserId,
      storage_bucket: ORDER_REFERENCE_ASSETS_BUCKET,
      storage_path: asset.storage_path,
      file_name: asset.file_name,
      file_type: asset.file_type,
      mime_type: asset.mime_type,
      size_bytes: asset.size_bytes,
      sort_order: asset.sort_order,
    }));

    const { error } = await withTimeout(
      supabaseAdmin.from("order_reference_assets").insert(assetRows as never),
      DB_OPTIONAL_TIMEOUT_MS,
      "reference assets insert timeout"
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("reference assets insert skipped", error);

    await safeInsertOrderEvent({
      orderId: args.orderId,
      actorUserId: args.bUserId,
      eventType: "order_reference_assets_insert_skipped",
      eventData: {
        message:
          error instanceof Error
            ? error.message
            : "reference assets insert skipped",
        reference_assets_count: args.referenceAssets.length,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  let createdOrderId: string | null = null;
  let actorUserId: string | null = null;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    actorUserId = user.id;

    const isCompany = await ensureCompanyUser(user.id);

    if (!isCompany) {
      return NextResponse.json(
        { error: "企業ユーザーのみ注文できます" },
        { status: 403 }
      );
    }

    const canUseOrders = await ensureNoActiveSuspension(user.id);

    if (!canUseOrders) {
      return NextResponse.json(
        { error: "現在このアカウントでは注文を開始できません" },
        { status: 403 }
      );
    }

    const company = await getCompany(user.id);

    if (!company) {
      return NextResponse.json(
        { error: "企業情報が見つかりませんでした" },
        { status: 400 }
      );
    }

    if (company.approval_status !== "approved") {
      return NextResponse.json(
        { error: "審査承認後に注文できます" },
        { status: 403 }
      );
    }

    const userState = await getUserState(user.id);
    const planCode = normalizeInternalPlanCode(userState?.company_plan_code);

    if (!userState?.company_profile_completed) {
      return NextResponse.json(
        { error: "注文前に企業プロフィールを完了してください" },
        { status: 403 }
      );
    }

    if (userState.company_access_status !== "approved") {
      return NextResponse.json(
        { error: "企業アカウントの承認後に注文できます" },
        { status: 403 }
      );
    }

    if (
      isPaidPlan(planCode) &&
      userState.company_subscription_status !== "active"
    ) {
      return NextResponse.json(
        { error: "有料プランの利用には月額課金の有効化が必要です" },
        { status: 403 }
      );
    }

    const monthlyLimit =
      typeof userState.monthly_request_limit === "number"
        ? userState.monthly_request_limit
        : null;

    const monthlyUsed =
      typeof userState.monthly_request_used === "number"
        ? userState.monthly_request_used
        : 0;

    if (monthlyLimit !== null && monthlyUsed >= monthlyLimit) {
      return NextResponse.json(
        { error: "今月の注文上限に達しています" },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "注文内容を取得できませんでした" },
        { status: 400 }
      );
    }

    const creatorId = getString(body.creator_id);
    const creatorMenuId = getString(body.creator_menu_id);
    const projectType = normalizeProjectType(body.project_type);
    const productName = getString(body.product_name);
    const productUrl = getNullableString(body.product_url);
    const deadline = getNullableString(body.deadline);
    const postNotes = getNullableString(body.post_notes);
    const requirements =
      getString(body.requirements ?? body.note) ||
      postNotes ||
      "詳細は注文後のチャットで相談します。";
    const hasFreeOffer = getBoolean(body.has_free_offer);
    const requestedSecondaryUse = getBoolean(body.wants_secondary_use);

    const prAccount = normalizePrAccount(body.pr_account);
    const prHashtags = normalizeHashtags(body.pr_hashtags);
    const prCopyText = buildPrCopyText({
      prAccount,
      prHashtags,
    });

    const { assets: referenceAssets, error: referenceAssetsError } =
      normalizeReferenceAssets(body.reference_assets, user.id);

    if (referenceAssetsError) {
      return NextResponse.json(
        { error: referenceAssetsError },
        { status: 400 }
      );
    }

    if (!creatorId) {
      return NextResponse.json(
        { error: "クリエイターIDがありません" },
        { status: 400 }
      );
    }

    if (!creatorMenuId) {
      return NextResponse.json(
        { error: "注文するメニューを選択してください" },
        { status: 400 }
      );
    }

    if (!projectType) {
      return NextResponse.json(
        { error: "案件タイプを選択してください" },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: "商品名・案件名を入力してください" },
        { status: 400 }
      );
    }

    if (requirements.length < 10) {
      return NextResponse.json(
        { error: "依頼内容は10文字以上で入力してください" },
        { status: 400 }
      );
    }

    if (!isDateStringOrNull(deadline)) {
      return NextResponse.json(
        { error: "納期の日付形式が正しくありません" },
        { status: 400 }
      );
    }

    const { data: creator, error: creatorError } = await withTimeout(
      supabaseAdmin
        .from("creators")
        .select(
          `
          id,
          user_id,
          display_name,
          approval_status,
          is_public,
          stripe_account_id,
          stripe_onboarding_completed
        `
        )
        .eq("id", creatorId)
        .eq("approval_status", "approved")
        .eq("is_public", true)
        .eq("stripe_onboarding_completed", true)
        .maybeSingle(),
      DB_TIMEOUT_MS,
      "クリエイター情報の取得に時間がかかっています"
    );

    if (creatorError) {
      throw creatorError;
    }

    if (!creator) {
      return NextResponse.json(
        { error: "クリエイターが見つかりませんでした" },
        { status: 404 }
      );
    }

    if (
      !creator.stripe_account_id ||
      creator.stripe_onboarding_completed !== true
    ) {
      return NextResponse.json(
        {
          error:
            "このクリエイターは現在、報酬受け取り設定が未完了のため注文できません。",
        },
        { status: 403 }
      );
    }

    const { data: menu, error: menuError } = await withTimeout(
      supabaseAdmin
        .from("creator_menus")
        .select(
          `
          id,
          creator_id,
          title,
          description,
          platform,
          sns,
          menu_type,
          category,
          price,
          currency,
          deliverables,
          delivery_days,
          account_url,
          reference_price_text,
          allow_secondary_use,
          notes,
          is_active
        `
        )
        .eq("id", creatorMenuId)
        .eq("creator_id", creator.id)
        .eq("is_active", true)
        .maybeSingle(),
      DB_TIMEOUT_MS,
      "メニュー情報の取得に時間がかかっています"
    );

    if (menuError) {
      throw menuError;
    }

    if (!menu) {
      return NextResponse.json(
        { error: "メニューが見つかりませんでした" },
        { status: 404 }
      );
    }

    const menuIsUgc = isUgcMenuSnapshot(menu);
    const wantsSecondaryUse =
      requestedSecondaryUse && (!!menu.allow_secondary_use || menuIsUgc);

    if (requestedSecondaryUse && !wantsSecondaryUse) {
      return NextResponse.json(
        { error: "このメニューでは二次利用は許可されていません" },
        { status: 400 }
      );
    }

    const menuPriceNumber = Number(menu.price);
    const menuPriceAmount = Number.isFinite(menuPriceNumber)
      ? Math.round(menuPriceNumber)
      : null;

    if (!menuPriceAmount || menuPriceAmount <= 0) {
      return NextResponse.json(
        { error: "このメニューには有効な価格が設定されていません" },
        { status: 400 }
      );
    }

    const currency = normalizeCurrency(menu.currency);

    if (currency !== "JPY") {
      return NextResponse.json(
        { error: "現在のMVPではJPYメニューのみ注文できます" },
        { status: 400 }
      );
    }

    const fees = calculateOrderFees({
      menuPriceAmount,
      buyerPlanCode: planCode,
    });

    const stripeAmount = toStripeAmount(fees.buyerTotalAmount, currency);

    if (!stripeAmount || stripeAmount <= 0) {
      return NextResponse.json(
        { error: "決済金額の計算に失敗しました" },
        { status: 400 }
      );
    }

    const email = user.email ?? company.contact_email ?? null;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを取得できませんでした" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const customer = await findOrCreateStripeCustomer({
      userId: user.id,
      email,
      companyName: company.company_name ?? null,
      existingCustomerId: userState.stripe_customer_id ?? null,
    });

    await upsertUserState(user.id, {
      stripe_customer_id: customer.id,
    });

    const orderInsert = {
      b_user_id: user.id,
      creator_id: creator.id,
      creator_user_id: creator.user_id,
      creator_menu_id: menu.id,

      status: "checkout_pending",
      payment_status: "checkout_pending",
      payment_flow: "manual_capture",

      project_type: projectType,
      product_name: productName,
      product_url: productUrl,
      requirements,
      deadline,
      has_free_offer: hasFreeOffer,
      wants_secondary_use: wantsSecondaryUse,

      pr_account: prAccount,
      pr_hashtags: prHashtags,
      pr_copy_text: prCopyText || null,
      post_notes: postNotes,

      menu_title_snapshot: menu.title,
      menu_description_snapshot: menu.description,
      menu_platform_snapshot: menu.platform ?? menu.sns,
      menu_type_snapshot: menu.menu_type,
      menu_category_snapshot: menu.category,
      menu_deliverables_snapshot: menu.deliverables,
      menu_delivery_days_snapshot: menu.delivery_days,
      menu_allow_secondary_use_snapshot: !!menu.allow_secondary_use || menuIsUgc,

      currency,
      menu_price_amount: fees.menuPriceAmount,
      stripe_amount: stripeAmount,

      buyer_plan_code_snapshot: fees.buyerPlanCodeSnapshot,
      buyer_plan_public_name_snapshot: fees.buyerPlanPublicNameSnapshot,
      buyer_marketplace_fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
      buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
      buyer_total_amount: fees.buyerTotalAmount,

      creator_transaction_fee_rate_bps: fees.creatorTransactionFeeRateBps,
      creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
      platform_gross_revenue_amount: fees.platformGrossRevenueAmount,

      fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
      platform_fee_amount: fees.platformGrossRevenueAmount,
      creator_payout_amount: fees.creatorPayoutAmount,

      stripe_customer_id: customer.id,
      stripe_payment_status: "checkout_pending",

      metadata: {
        source: "orders_checkout_api_v3_non_blocking_reference_assets",
        plan_code: planCode,
        plan_public_name: fees.buyerPlanPublicNameSnapshot,
        payment_flow: "manual_capture",
        project_type: projectType,
        buyer_marketplace_fee_rate_bps: fees.buyerMarketplaceFeeRateBps,
        creator_transaction_fee_rate_bps: fees.creatorTransactionFeeRateBps,
        pr_account: prAccount,
        pr_hashtags: prHashtags,
        reference_assets_count: referenceAssets.length,
      },
    };

    const { data: order, error: orderError } = await withTimeout(
      supabaseAdmin
        .from("orders")
        .insert(orderInsert as never)
        .select("id")
        .single(),
      DB_TIMEOUT_MS,
      "注文情報の作成に時間がかかっています"
    );

    if (orderError || !order) {
      throw orderError ?? new Error("Order creation failed");
    }

    createdOrderId = order.id;

    const successUrl = `${baseUrl}/b/orders/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/b/creators/${creator.id}/request?menuId=${menu.id}&checkout=cancelled`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(fees.menuPriceAmount, currency)!,
          product_data: {
            name: menu.title,
            description: menu.description?.slice(0, 500) ?? undefined,
            metadata: {
              creator_id: creator.id,
              creator_menu_id: menu.id,
              order_id: order.id,
              item_type: "creator_menu",
            },
          },
        },
        quantity: 1,
      },
    ];

    if (fees.buyerMarketplaceFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(
            fees.buyerMarketplaceFeeAmount,
            currency
          )!,
          product_data: {
            name: "Trendre marketplace fee",
            description: `Buyer marketplace fee ${
              fees.buyerMarketplaceFeeRateBps / 100
            }%`,
            metadata: {
              order_id: order.id,
              item_type: "buyer_marketplace_fee",
            },
          },
        },
        quantity: 1,
      });
    }

    const session = await withTimeout(
      stripe.checkout.sessions.create({
        mode: "payment",
        customer: customer.id,
        client_reference_id: order.id,
        payment_method_types: ["card"],
        line_items: lineItems,
        payment_intent_data: {
          capture_method: "manual",
          metadata: {
            order_id: order.id,
            supabase_user_id: user.id,
            b_user_id: user.id,
            creator_id: creator.id,
            creator_user_id: creator.user_id,
            creator_menu_id: menu.id,
            payment_flow: "manual_capture",
            project_type: projectType,
            menu_price_amount: String(fees.menuPriceAmount),
            buyer_marketplace_fee_amount: String(
              fees.buyerMarketplaceFeeAmount
            ),
            buyer_total_amount: String(fees.buyerTotalAmount),
            creator_transaction_fee_amount: String(
              fees.creatorTransactionFeeAmount
            ),
            creator_payout_amount: String(fees.creatorPayoutAmount),
            platform_gross_revenue_amount: String(
              fees.platformGrossRevenueAmount
            ),
          },
        },
        metadata: {
          order_id: order.id,
          supabase_user_id: user.id,
          b_user_id: user.id,
          creator_id: creator.id,
          creator_user_id: creator.user_id,
          creator_menu_id: menu.id,
          payment_flow: "manual_capture",
          project_type: projectType,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
      }),
      STRIPE_SESSION_TIMEOUT_MS,
      "Stripe Checkoutの作成に時間がかかっています"
    );

    if (!session.url) {
      throw new Error("Checkout URL was not created");
    }

    try {
      const { error: updateOrderError } = await withTimeout(
        supabaseAdmin
          .from("orders")
          .update({
            stripe_checkout_session_id: session.id,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", order.id),
        DB_OPTIONAL_TIMEOUT_MS,
        "checkout session id update timeout"
      );

      if (updateOrderError) {
        console.warn("checkout session id update error", updateOrderError);
      }
    } catch (error) {
      console.warn("checkout session id update skipped", error);
    }

    await safePersistReferenceAssets({
      orderId: order.id,
      bUserId: user.id,
      creatorUserId: creator.user_id,
      referenceAssets,
    });

    await safeInsertOrderEvent({
      orderId: order.id,
      actorUserId: user.id,
      eventType: "stripe_checkout_session_created",
      eventData: {
        stripe_checkout_session_id: session.id,
        checkout_amount: stripeAmount,
        menu_price_amount: fees.menuPriceAmount,
        buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
        buyer_total_amount: fees.buyerTotalAmount,
        creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
        creator_payout_amount: fees.creatorPayoutAmount,
        platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
        project_type: projectType,
        reference_assets_count: referenceAssets.length,
      },
    });

    return NextResponse.json({
      url: session.url,
      order_id: order.id,
      checkout_session_id: session.id,
      reference_assets_count: referenceAssets.length,
      amount: {
        currency,
        menu_price_amount: fees.menuPriceAmount,
        buyer_marketplace_fee_amount: fees.buyerMarketplaceFeeAmount,
        buyer_total_amount: fees.buyerTotalAmount,
        creator_transaction_fee_amount: fees.creatorTransactionFeeAmount,
        creator_payout_amount: fees.creatorPayoutAmount,
        platform_gross_revenue_amount: fees.platformGrossRevenueAmount,
      },
    });
  } catch (error) {
    console.error("orders checkout error", error);

    if (createdOrderId) {
      await safeInsertOrderEvent({
        orderId: createdOrderId,
        actorUserId,
        eventType: "orders_checkout_error",
        eventData: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown orders checkout error",
        },
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "注文用Checkoutの作成に失敗しました",
      },
      { status: 500 }
    );
  }
}