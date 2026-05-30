// File: app/b/orders/[id]/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";
import DeadlineBadge from "@/app/components/DeadlineBadge";

type OrderDetail = {
  id: string;
  b_user_id: string;
  creator_id: string;
  creator_user_id: string;

  status: string;
  payment_status: string;
  stripe_payment_status: string | null;
  created_at: string;
  updated_at: string | null;

  product_name: string | null;
  product_url: string | null;
  requirements: string | null;
  deadline: string | null;
  has_free_offer: boolean | null;
  wants_secondary_use: boolean | null;

  menu_title_snapshot: string | null;
  menu_description_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;
  menu_allow_secondary_use_snapshot: boolean | null;

  currency: string | null;
  menu_price_amount: number | null;
  stripe_amount: number | null;
  platform_fee_amount: number | null;
  creator_payout_amount: number | null;

  buyer_plan_code_snapshot: string | null;
  buyer_plan_public_name_snapshot: string | null;
  buyer_marketplace_fee_rate_bps: number | null;
  buyer_marketplace_fee_amount: number | null;
  buyer_total_amount: number | null;
  creator_transaction_fee_rate_bps: number | null;
  creator_transaction_fee_amount: number | null;
  platform_gross_revenue_amount: number | null;

  creator_accept_deadline: string | null;
  authorized_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  captured_at: string | null;
  canceled_at: string | null;

  delivered_at: string | null;
  delivered_post_url: string | null;
  completed_at: string | null;
  disputed_at: string | null;

  revision_requested_at: string | null;
  revision_note: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
  completed_reason: string | null;
};

type InfluencerLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  category: string | null;
};

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    if (safeCurrency === "USD") return `$${value.toLocaleString()}`;
    return `¥${value.toLocaleString()}`;
  }
}

function formatPlanName(value: string | null | undefined) {
  if (!value) return "-";

  const normalized = value.toLowerCase();

  if (normalized === "basic" || normalized === "free") return "Basic";
  if (normalized === "pro" || normalized === "standard") return "Pro";
  if (normalized === "premium" || normalized === "global_pro") return "Premium";

  return value;
}

function formatDeliveryDays(
  value: number | null | undefined,
  locale: "ja" | "en",
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function getMenuTypeLabel(
  value: string | null | undefined,
  locale: "ja" | "en",
  fallback: string
) {
  const labels: Record<string, { ja: string; en: string }> = {
    post: { ja: "投稿", en: "Post" },
    short_video: { ja: "ショート動画", en: "Short video" },
    story: { ja: "ストーリー", en: "Story" },
    video: { ja: "動画", en: "Video" },
    ugc: { ja: "UGC制作", en: "UGC creation" },
    package: { ja: "セットメニュー", en: "Package" },
    other: { ja: "その他", en: "Other" },
  };

  return labels[value || ""]?.[locale] || fallback;
}

function getPlatformIcon(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.includes("instagram")) {
    return (
      <img
        src="/brand/social/instagram.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <img
        src="/brand/social/tiktok.png"
        alt=""
        className="h-4 w-4 object-contain"
        aria-hidden="true"
      />
    );
  }

  return null;
}

function getStatusMeta(status: string, locale: "ja" | "en") {
  const ja: Record<
    string,
    {
      label: string;
      className: string;
      title: string;
      body: string;
      actionLabel: string;
    }
  > = {
    checkout_pending: {
      label: "支払い確認中",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
      title: "支払い確認中です",
      body: "支払い確認が完了すると、インフルエンサーへの返答待ちに進みます。",
      actionLabel: "確認中",
    },
    authorized_pending_creator: {
      label: "返答待ち",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
      title: "インフルエンサーの返答待ちです",
      body:
        "承認されると注文が開始されます。辞退または期限切れの場合、請求は確定しません。",
      actionLabel: "返答待ち",
    },
    accepted_captured: {
      label: "進行中",
      className: "bg-slate-950 text-white ring-slate-950",
      title: "注文は進行中です",
      body:
        "必要な確認や連絡はチャットで行えます。納品URLが届いたら内容を確認してください。",
      actionLabel: "チャットで確認",
    },
    in_progress: {
      label: "進行中",
      className: "bg-slate-950 text-white ring-slate-950",
      title: "注文は進行中です",
      body:
        "必要な確認や連絡はチャットで行えます。納品URLが届いたら内容を確認してください。",
      actionLabel: "チャットで確認",
    },
    delivered: {
      label: "確認する",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
      title: "納品内容を確認してください",
      body:
        "問題なければ注文を完了できます。修正依頼は元の注文内容に沿う範囲でのみ行えます。",
      actionLabel: "納品確認",
    },
    revision_requested: {
      label: "修正依頼中",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
      title: "修正依頼を送信済みです",
      body:
        "インフルエンサーから再納品されるまでお待ちください。必要な確認はチャットで行えます。",
      actionLabel: "再納品待ち",
    },
    completed: {
      label: "完了",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      title: "この注文は完了しています",
      body:
        "完了後は原則として修正依頼・返金はできません。追加依頼は新しい注文として相談してください。",
      actionLabel: "完了",
    },
    declined_canceled: {
      label: "終了",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
      title: "この注文は終了しています",
      body: "インフルエンサーの辞退により、請求は確定していません。",
      actionLabel: "終了",
    },
    expired_canceled: {
      label: "期限切れ",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
      title: "この注文は期限切れです",
      body: "返答期限を過ぎたため、請求は確定していません。",
      actionLabel: "期限切れ",
    },
  };

  const en: typeof ja = {
    checkout_pending: {
      label: "Payment pending",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
      title: "Payment is being confirmed",
      body: "Once payment is confirmed, the order will wait for influencer approval.",
      actionLabel: "Pending",
    },
    authorized_pending_creator: {
      label: "Waiting",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
      title: "Waiting for influencer reply",
      body:
        "The order begins once accepted. If declined or expired, the charge is not captured.",
      actionLabel: "Waiting",
    },
    accepted_captured: {
      label: "In progress",
      className: "bg-slate-950 text-white ring-slate-950",
      title: "Order is in progress",
      body:
        "Use chat for necessary confirmation. Review the delivery once the URL is submitted.",
      actionLabel: "Use chat",
    },
    in_progress: {
      label: "In progress",
      className: "bg-slate-950 text-white ring-slate-950",
      title: "Order is in progress",
      body:
        "Use chat for necessary confirmation. Review the delivery once the URL is submitted.",
      actionLabel: "Use chat",
    },
    delivered: {
      label: "Review",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
      title: "Review the delivery",
      body:
        "Complete the order if everything is okay. Revisions should stay within the original requirements.",
      actionLabel: "Review",
    },
    revision_requested: {
      label: "Revision",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
      title: "Revision request sent",
      body:
        "Please wait for the influencer to submit the updated delivery. Use chat for any confirmation.",
      actionLabel: "Waiting",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      title: "This order is completed",
      body:
        "Revisions and refunds are generally unavailable after completion. Please place a new order for additional work.",
      actionLabel: "Completed",
    },
    declined_canceled: {
      label: "Ended",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
      title: "This order has ended",
      body: "The influencer declined, so the charge was not captured.",
      actionLabel: "Ended",
    },
    expired_canceled: {
      label: "Expired",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
      title: "This order expired",
      body: "The reply deadline passed, so the charge was not captured.",
      actionLabel: "Expired",
    },
  };

  return (
    (locale === "ja" ? ja[status] : en[status]) ?? {
      label: status,
      className: "bg-slate-100 text-slate-700 ring-slate-200",
      title: locale === "ja" ? "注文状態を確認してください" : "Check order status",
      body:
        locale === "ja"
          ? "注文内容とチャットを確認できます。"
          : "You can review the order and chat here.",
      actionLabel: locale === "ja" ? "確認" : "Check",
    }
  );
}

function isWaitingStatus(status: string) {
  return status === "authorized_pending_creator" || status === "checkout_pending";
}

function isActiveStatus(status: string) {
  return (
    status === "accepted_captured" ||
    status === "in_progress" ||
    status === "revision_requested"
  );
}

function isDeliveredStatus(status: string) {
  return status === "delivered";
}

function isCompletedStatus(status: string) {
  return status === "completed";
}

function getBackHref(status: string) {
  if (isWaitingStatus(status)) {
    return "/b/orders?tab=waiting";
  }

  if (isDeliveredStatus(status)) {
    return "/b/orders?tab=review";
  }

  if (isCompletedStatus(status)) {
    return "/b/orders?tab=completed";
  }

  return "/b/orders";
}

function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span
        className={`max-w-[66%] text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InfluencerAvatar({
  influencer,
}: {
  influencer: InfluencerLite | null;
}) {
  if (influencer?.avatar_url) {
    return (
      <img
        src={influencer.avatar_url}
        alt={influencer.display_name ?? "influencer"}
        className="h-14 w-14 rounded-2xl object-cover"
      />
    );
  }

  const initial = (influencer?.display_name?.trim()?.[0] ?? "I").toUpperCase();

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-100 text-lg font-black text-slate-900">
      {initial}
    </div>
  );
}

function ActionCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-7">
      <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
        {body}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function CompactCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
      <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[24px] bg-white shadow-[0_14px_45px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6"
      >
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-5 pb-5 pt-2 md:px-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function TextBlock({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

export default function CompanyOrderDetailPage() {
  const params = useParams();
  const orderId = String(params.id ?? "");

  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            notFound: "注文が見つかりませんでした。",
            authFailed: "ログイン情報を取得できませんでした。",
            backOrders: "注文へ戻る",
            titleFallback: "注文詳細",
            pageSubtitle: "今の状態と次に必要な対応を確認できます。",
            influencer: "インフルエンサー",
            influencerProfile: "インフルエンサー詳細を見る",
            payment: "支払い金額",
            nextAction: "次にやること",
            chatTitle: "注文チャット",
            chatBody:
              "この注文に関する確認や連絡はここで行えます。",
            waitingSummaryTitle: "注文内容の要約",
            waitingSummaryBody:
              "インフルエンサーの承認後にチャットが利用できます。",
            deliveryTitle: "納品URL",
            openDelivery: "納品URLを開く",
            completeTitle: "納品確認",
            completeBody:
              "内容を確認し、問題なければ完了してください。完了後は原則として修正依頼・返金はできません。",
            complete: "完了する",
            completing: "完了処理中...",
            confirmComplete:
              "この注文を完了しますか？納品内容を確認済みの場合のみ実行してください。",
            completeFailed: "完了処理に失敗しました。",
            revisionTitle: "修正依頼",
            revisionBody:
              "元の注文内容に沿う範囲でのみ修正依頼できます。追加依頼は新しい注文として相談してください。",
            revisionPlaceholder:
              "例：注文時に依頼した内容のうち、〇〇が反映されていないため修正してください。",
            requestRevision: "修正依頼を送信",
            requestingRevision: "送信中...",
            confirmRevision:
              "修正依頼を送信しますか？元の注文内容に沿う範囲の場合のみ送信してください。",
            revisionFailed: "修正依頼の送信に失敗しました。",
            revisionNoteRequired:
              "修正依頼内容は10文字以上で入力してください。",
            revisionLimitReached:
              "修正依頼の上限回数に達しています。追加修正が必要な場合はチャットで相談するか、新しい注文として依頼してください。",
            revisionNoteLabel: "修正依頼内容",
            currentRevisionNote: "現在の修正依頼",
            orderContent: "注文内容",
            orderContentSub: "必要な時だけ確認できます",
            menuContent: "メニュー詳細",
            menuContentSub: "注文時点のメニュー内容",
            paymentContent: "支払い詳細",
            paymentContentSub: "金額の内訳",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            deadline: "希望日",
            freeOffer: "商品の無償提供",
            secondaryUse: "二次利用希望",
            yes: "あり",
            no: "なし",
            requirements: "依頼内容",
            menuTitle: "メニュー名",
            platform: "SNS",
            menuType: "形式",
            price: "価格",
            deliveryDays: "目安",
            deliverables: "納品物",
            menuDescription: "説明",
            secondaryUseAllowed: "二次利用",
            allowed: "可",
            notAllowed: "不可",
            plan: "プラン",
            menuPrice: "メニュー価格",
            serviceFee: "サービス手数料",
            total: "合計",
            notSet: "未設定",
            category: "カテゴリー",
            acceptDeadline: "返答期限",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            authFailed: "Could not retrieve your login session.",
            backOrders: "Back to orders",
            titleFallback: "Order details",
            pageSubtitle: "Check the current status and the next action.",
            influencer: "Influencer",
            influencerProfile: "View influencer profile",
            payment: "Payment",
            nextAction: "Next action",
            chatTitle: "Order chat",
            chatBody:
              "Use this chat for confirmations and messages about this order.",
            waitingSummaryTitle: "Order summary",
            waitingSummaryBody:
              "Chat becomes available after the influencer accepts.",
            deliveryTitle: "Delivery URL",
            openDelivery: "Open delivery URL",
            completeTitle: "Review delivery",
            completeBody:
              "Complete the order if everything is okay. Revisions and refunds are generally unavailable after completion.",
            complete: "Complete",
            completing: "Completing...",
            confirmComplete:
              "Complete this order? Please do this only after reviewing the delivery.",
            completeFailed: "Failed to complete this order.",
            revisionTitle: "Request revision",
            revisionBody:
              "Revisions should stay within the original order requirements. Additional work should be handled as a new order.",
            revisionPlaceholder:
              "Example: Please revise the missing point from the original requirements.",
            requestRevision: "Send revision request",
            requestingRevision: "Sending...",
            confirmRevision:
              "Send this revision request? Please make sure it is within the original requirements.",
            revisionFailed: "Failed to send revision request.",
            revisionNoteRequired:
              "Please enter at least 10 characters for the revision request.",
            revisionLimitReached:
              "The revision request limit has been reached. Please use chat or place a new order for additional work.",
            revisionNoteLabel: "Revision request",
            currentRevisionNote: "Current revision request",
            orderContent: "Order details",
            orderContentSub: "Available when needed",
            menuContent: "Menu details",
            menuContentSub: "Menu snapshot at purchase",
            paymentContent: "Payment details",
            paymentContentSub: "Amount breakdown",
            productName: "Product / Campaign",
            productUrl: "Product URL",
            deadline: "Preferred date",
            freeOffer: "Free product offer",
            secondaryUse: "Secondary use",
            yes: "Yes",
            no: "No",
            requirements: "Requirements",
            menuTitle: "Menu title",
            platform: "Platform",
            menuType: "Format",
            price: "Price",
            deliveryDays: "Timeline",
            deliverables: "Deliverables",
            menuDescription: "Description",
            secondaryUseAllowed: "Secondary use",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            plan: "Plan",
            menuPrice: "Menu price",
            serviceFee: "Service fee",
            total: "Total",
            notSet: "Not set",
            category: "Category",
            acceptDeadline: "Reply deadline",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [influencer, setInfluencer] = useState<InfluencerLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "complete" | "revision" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(copy.authFailed);
      setOrder(null);
      setInfluencer(null);
      setLoading(false);
      return;
    }

    const { data, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
        b_user_id,
        creator_id,
        creator_user_id,
        status,
        payment_status,
        stripe_payment_status,
        created_at,
        updated_at,
        product_name,
        product_url,
        requirements,
        deadline,
        has_free_offer,
        wants_secondary_use,
        menu_title_snapshot,
        menu_description_snapshot,
        menu_platform_snapshot,
        menu_type_snapshot,
        menu_category_snapshot,
        menu_deliverables_snapshot,
        menu_delivery_days_snapshot,
        menu_allow_secondary_use_snapshot,
        currency,
        menu_price_amount,
        stripe_amount,
        platform_fee_amount,
        creator_payout_amount,
        buyer_plan_code_snapshot,
        buyer_plan_public_name_snapshot,
        buyer_marketplace_fee_rate_bps,
        buyer_marketplace_fee_amount,
        buyer_total_amount,
        creator_transaction_fee_rate_bps,
        creator_transaction_fee_amount,
        platform_gross_revenue_amount,
        creator_accept_deadline,
        authorized_at,
        accepted_at,
        declined_at,
        expired_at,
        captured_at,
        canceled_at,
        delivered_at,
        delivered_post_url,
        completed_at,
        disputed_at,
        revision_requested_at,
        revision_note,
        revision_count,
        max_revision_count,
        auto_complete_at,
        completed_reason
      `
      )
      .eq("id", orderId)
      .eq("b_user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("company order detail load error:", orderError);
      setError(copy.notFound);
      setOrder(null);
      setInfluencer(null);
      setLoading(false);
      return;
    }

    const nextOrder = (data as OrderDetail | null) ?? null;

    setOrder(nextOrder);

    if (!nextOrder) {
      setInfluencer(null);
      setLoading(false);
      return;
    }

    const { data: influencerData, error: influencerError } = await supabase
      .from("creators")
      .select("id, display_name, avatar_url, category")
      .eq("id", nextOrder.creator_id)
      .maybeSingle();

    if (influencerError) {
      console.error("company order influencer load error:", influencerError);
      setInfluencer(null);
    } else {
      setInfluencer((influencerData as InfluencerLite | null) ?? null);
    }

    setLoading(false);
  }, [copy.authFailed, copy.notFound, orderId, supabase]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const runComplete = async () => {
    if (!order) return;

    if (!window.confirm(copy.confirmComplete)) return;

    setActionLoading("complete");
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token ?? null;

    if (!accessToken) {
      setError(copy.authFailed);
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch(`/api/b/orders/${order.id}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.completeFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.completeFailed);
      setActionLoading(null);
    }
  };

  const runRequestRevision = async () => {
    if (!order) return;

    const note = revisionNote.trim();

    if (note.length < 10) {
      setError(copy.revisionNoteRequired);
      return;
    }

    if (!window.confirm(copy.confirmRevision)) return;

    setActionLoading("revision");
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token ?? null;

    if (!accessToken) {
      setError(copy.authFailed);
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch(`/api/b/orders/${order.id}/request-revision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          revision_note: note,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.revisionFailed);
        setActionLoading(null);
        return;
      }

      setRevisionNote("");
      await loadOrder();
      setActionLoading(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.revisionFailed);
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-96 animate-pulse rounded-[28px] bg-white shadow-sm" />
            <div className="h-80 animate-pulse rounded-[28px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.045)]">
          <p className="text-sm font-semibold text-slate-600">
            {error ?? copy.notFound}
          </p>

          <Link
            href="/b/orders"
            className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {copy.backOrders}
          </Link>
        </div>
      </div>
    );
  }

  const meta = getStatusMeta(order.status, safeLocale);
  const backHref = getBackHref(order.status);

  const buyerTotal =
    order.buyer_total_amount ?? order.stripe_amount ?? order.menu_price_amount;

  const buyerFee =
    order.buyer_marketplace_fee_amount ??
    Math.max(0, (buyerTotal ?? 0) - (order.menu_price_amount ?? 0));

  const planName =
    order.buyer_plan_public_name_snapshot ||
    formatPlanName(order.buyer_plan_code_snapshot);

  const canReviewDelivery =
    isDeliveredStatus(order.status) && order.payment_status === "captured";

  const revisionLimitReached =
    (order.revision_count ?? 0) >= (order.max_revision_count ?? 1);

  const canRequestRevision = canReviewDelivery && !revisionLimitReached;

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill className={meta.className}>{meta.label}</Pill>

                {order.creator_accept_deadline && isWaitingStatus(order.status) ? (
                  <DeadlineBadge
                    deadline={order.creator_accept_deadline}
                    label={copy.acceptDeadline}
                    expiredLabel={copy.acceptDeadline}
                    locale={safeLocale}
                    urgentHours={12}
                    warningHours={24}
                  />
                ) : null}

                {order.auto_complete_at && isDeliveredStatus(order.status) ? (
                  <DeadlineBadge
                    deadline={order.auto_complete_at}
                    label={copy.autoComplete}
                    expiredLabel={copy.autoCompleteExpired}
                    locale={safeLocale}
                    urgentHours={12}
                    warningHours={24}
                  />
                ) : null}
              </div>

              <h1 className="mt-4 text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {order.product_name || copy.titleFallback}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.pageSubtitle}
              </p>
            </div>

            <Link
              href={backHref}
              className="inline-flex w-fit items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
            >
              {copy.backOrders}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5">
            {isWaitingStatus(order.status) ? (
              <ActionCard title={meta.title} body={meta.body}>
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <InfluencerAvatar influencer={influencer} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-500">
                        {copy.influencer}
                      </p>
                      <p className="mt-1 truncate text-xl font-black text-slate-950">
                        {influencer?.display_name || copy.notSet}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {influencer?.category || copy.notSet}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black text-slate-400">
                        {copy.payment}
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-950">
                        {formatPrice(buyerTotal, order.currency, safeLocale)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-black text-slate-400">
                        {copy.menuTitle}
                      </p>
                      <p className="mt-2 truncate text-lg font-black text-slate-950">
                        {order.menu_title_snapshot || copy.notSet}
                      </p>
                    </div>
                  </div>
                </div>
              </ActionCard>
            ) : null}

            {isActiveStatus(order.status) ? (
              <ActionCard title={meta.title} body={meta.body}>
                <ChatEmbed orderId={order.id} title={copy.chatTitle} />
              </ActionCard>
            ) : null}

            {isDeliveredStatus(order.status) ? (
              <ActionCard title={meta.title} body={meta.body}>
                {order.delivered_post_url ? (
                  <a
                    href={order.delivered_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    {copy.openDelivery}
                  </a>
                ) : null}

                {canReviewDelivery ? (
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => void runComplete()}
                      disabled={actionLoading !== null}
                      className="rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === "complete"
                        ? copy.completing
                        : copy.complete}
                    </button>

                    {canRequestRevision ? (
                      <div className="rounded-[24px] bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-950">
                          {copy.revisionTitle}
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          {copy.revisionBody}
                        </p>

                        <textarea
                          value={revisionNote}
                          onChange={(event) =>
                            setRevisionNote(event.target.value)
                          }
                          placeholder={copy.revisionPlaceholder}
                          rows={4}
                          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-950"
                        />

                        <button
                          type="button"
                          onClick={() => void runRequestRevision()}
                          disabled={actionLoading !== null}
                          className="mt-3 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === "revision"
                            ? copy.requestingRevision
                            : copy.requestRevision}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5">
                  <ChatEmbed orderId={order.id} title={copy.chatTitle} />
                </div>
              </ActionCard>
            ) : null}

            {isCompletedStatus(order.status) ||
            order.status === "declined_canceled" ||
            order.status === "expired_canceled" ? (
              <ActionCard title={meta.title} body={meta.body}>
                {order.delivered_post_url ? (
                  <a
                    href={order.delivered_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 underline-offset-4 transition hover:bg-slate-200 hover:underline"
                  >
                    {copy.openDelivery}
                  </a>
                ) : null}

                <div className="mt-5">
                  <ChatEmbed orderId={order.id} title={copy.chatTitle} />
                </div>
              </ActionCard>
            ) : null}

            {order.revision_note ? (
              <CompactCard title={copy.currentRevisionNote}>
                <TextBlock
                  label={copy.revisionNoteLabel}
                  value={order.revision_note}
                  emptyLabel={copy.notSet}
                />
              </CompactCard>
            ) : null}

            <div className="space-y-3">
              <CollapsibleCard
                title={copy.orderContent}
                subtitle={copy.orderContentSub}
              >
                <DetailRow
                  label={copy.productName}
                  value={order.product_name || copy.notSet}
                  strong
                />
                <DetailRow
                  label={copy.productUrl}
                  value={
                    order.product_url ? (
                      <a
                        href={order.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-blue-600 underline underline-offset-4"
                      >
                        {order.product_url}
                      </a>
                    ) : (
                      copy.notSet
                    )
                  }
                />
                <DetailRow
                  label={copy.deadline}
                  value={formatDate(order.deadline, safeLocale)}
                />
                <DetailRow
                  label={copy.freeOffer}
                  value={order.has_free_offer ? copy.yes : copy.no}
                />
                <DetailRow
                  label={copy.secondaryUse}
                  value={order.wants_secondary_use ? copy.yes : copy.no}
                />

                <div className="mt-4">
                  <TextBlock
                    label={copy.requirements}
                    value={order.requirements}
                    emptyLabel={copy.notSet}
                  />
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title={copy.menuContent}
                subtitle={copy.menuContentSub}
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {order.menu_platform_snapshot ? (
                    <Pill className="bg-slate-950 text-white ring-slate-950">
                      {getPlatformIcon(order.menu_platform_snapshot)}
                      {order.menu_platform_snapshot}
                    </Pill>
                  ) : null}

                  <Pill className="bg-slate-100 text-slate-700 ring-slate-200">
                    {getMenuTypeLabel(
                      order.menu_type_snapshot,
                      safeLocale,
                      order.menu_category_snapshot || copy.notSet
                    )}
                  </Pill>

                  {order.menu_category_snapshot ? (
                    <Pill className="bg-rose-50 text-[#ff5f67] ring-rose-100">
                      {order.menu_category_snapshot}
                    </Pill>
                  ) : null}
                </div>

                <DetailRow
                  label={copy.menuTitle}
                  value={order.menu_title_snapshot || copy.notSet}
                  strong
                />
                <DetailRow
                  label={copy.price}
                  value={formatPrice(
                    order.menu_price_amount,
                    order.currency,
                    safeLocale
                  )}
                />
                <DetailRow
                  label={copy.deliveryDays}
                  value={formatDeliveryDays(
                    order.menu_delivery_days_snapshot,
                    safeLocale,
                    copy.notSet
                  )}
                />
                <DetailRow
                  label={copy.secondaryUseAllowed}
                  value={
                    order.menu_allow_secondary_use_snapshot
                      ? copy.allowed
                      : copy.notAllowed
                  }
                />

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <TextBlock
                    label={copy.menuDescription}
                    value={order.menu_description_snapshot}
                    emptyLabel={copy.notSet}
                  />
                  <TextBlock
                    label={copy.deliverables}
                    value={order.menu_deliverables_snapshot}
                    emptyLabel={copy.notSet}
                  />
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title={copy.paymentContent}
                subtitle={copy.paymentContentSub}
              >
                <DetailRow label={copy.plan} value={planName} />
                <DetailRow
                  label={copy.menuPrice}
                  value={formatPrice(
                    order.menu_price_amount,
                    order.currency,
                    safeLocale
                  )}
                />
                <DetailRow
                  label={copy.serviceFee}
                  value={formatPrice(buyerFee, order.currency, safeLocale)}
                />
                <DetailRow
                  label={copy.total}
                  value={formatPrice(buyerTotal, order.currency, safeLocale)}
                  strong
                />
              </CollapsibleCard>
            </div>
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <CompactCard title={copy.nextAction}>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400">
                  {meta.actionLabel}
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {meta.body}
                </p>
              </div>
            </CompactCard>

            <CompactCard title={copy.influencer}>
              <div className="flex items-center gap-4">
                <InfluencerAvatar influencer={influencer} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">
                    {influencer?.display_name || copy.notSet}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {influencer?.category || copy.notSet}
                  </p>
                </div>
              </div>

              {influencer?.id ? (
                <Link
                  href={`/b/creators/${influencer.id}`}
                  className="mt-5 flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
                >
                  {copy.influencerProfile}
                </Link>
              ) : null}
            </CompactCard>

            <CompactCard title={copy.payment}>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <DetailRow
                  label={copy.total}
                  value={formatPrice(buyerTotal, order.currency, safeLocale)}
                  strong
                />
                <DetailRow
                  label={copy.menuTitle}
                  value={order.menu_title_snapshot || copy.notSet}
                />
              </div>
            </CompactCard>
          </aside>
        </section>
      </div>
    </div>
  );
}