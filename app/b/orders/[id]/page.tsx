// File: app/b/orders/[id]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";

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

  product_name: string;
  product_url: string | null;
  requirements: string;
  deadline: string | null;
  has_free_offer: boolean;
  wants_secondary_use: boolean;

  menu_title_snapshot: string;
  menu_description_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;
  menu_allow_secondary_use_snapshot: boolean;

  currency: string;
  menu_price_amount: number;
  stripe_amount: number;
  platform_fee_amount: number;
  creator_payout_amount: number;

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
  revision_count: number;
  max_revision_count: number;
  auto_complete_at: string | null;
  completed_reason: string | null;
};

type CreatorLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  category: string | null;
};

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
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

function formatBpsPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "-";

  const percent = Number(value) / 100;
  return `${percent.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
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
  value: number | null,
  locale: "ja" | "en",
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function menuTypeLabel(
  value: string | null,
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

  if (normalized.includes("instagram")) return "◎";
  if (normalized.includes("tiktok")) return "♪";
  if (normalized.includes("youtube")) return "▶";
  if (normalized === "x" || normalized.includes("twitter")) return "𝕏";
  if (normalized.includes("ugc")) return "▣";

  return "●";
}

function statusLabel(status: string, locale: "ja" | "en") {
  const ja: Record<string, string> = {
    checkout_pending: "Checkout未完了",
    authorized_pending_creator: "クリエイター承認待ち",
    accepted_captured: "進行中",
    declined_canceled: "辞退済み",
    expired_canceled: "期限切れ",
    capture_failed: "決済確定失敗",
    cancel_failed: "取消失敗",
    in_progress: "進行中",
    delivered: "納品済み",
    revision_requested: "修正依頼中",
    completed: "完了",
    disputed: "確認中",
  };

  const en: Record<string, string> = {
    checkout_pending: "Checkout pending",
    authorized_pending_creator: "Waiting for creator approval",
    accepted_captured: "In progress",
    declined_canceled: "Declined",
    expired_canceled: "Expired",
    capture_failed: "Capture failed",
    cancel_failed: "Cancel failed",
    in_progress: "In progress",
    delivered: "Delivered",
    revision_requested: "Revision requested",
    completed: "Completed",
    disputed: "Disputed",
  };

  return locale === "ja" ? ja[status] ?? status : en[status] ?? status;
}

function completedReasonLabel(value: string | null, locale: "ja" | "en") {
  if (!value) return "-";

  const ja: Record<string, string> = {
    buyer_approved: "企業承認",
    auto_after_72h: "72時間経過による自動完了",
  };

  const en: Record<string, string> = {
    buyer_approved: "Buyer approved",
    auto_after_72h: "Auto-completed after 72 hours",
  };

  return locale === "ja" ? ja[value] ?? value : en[value] ?? value;
}

function statusClass(status: string) {
  if (status === "authorized_pending_creator") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (status === "accepted_captured" || status === "in_progress") {
    return "bg-blue-100 text-blue-700 ring-blue-200";
  }

  if (status === "delivered") {
    return "bg-purple-100 text-purple-700 ring-purple-200";
  }

  if (status === "revision_requested") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  if (
    status === "declined_canceled" ||
    status === "expired_canceled" ||
    status === "capture_failed" ||
    status === "cancel_failed" ||
    status === "disputed"
  ) {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function paymentStatusClass(paymentStatus: string) {
  if (paymentStatus === "authorized") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (paymentStatus === "captured") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  if (paymentStatus === "canceled") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (paymentStatus === "failed") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getNotice(status: string, locale: "ja" | "en") {
  if (locale === "ja") {
    if (status === "authorized_pending_creator") {
      return {
        tone: "amber" as const,
        title: "クリエイターの承認待ちです",
        body: "支払い方法は確認済みです。クリエイターが承認すると決済が確定し、案件が開始されます。",
      };
    }

    if (status === "delivered") {
      return {
        tone: "purple" as const,
        title: "納品URLが提出されています",
        body: "内容を確認し、問題なければ完了してください。元の注文要件に沿う範囲でのみ修正依頼できます。",
      };
    }

    if (status === "revision_requested") {
      return {
        tone: "amber" as const,
        title: "修正依頼を送信済みです",
        body: "クリエイターが修正版を再納品するまでお待ちください。必要な確認はチャットで行えます。",
      };
    }

    if (status === "completed") {
      return {
        tone: "green" as const,
        title: "この注文は完了しています",
        body: "完了後は原則として修正依頼・返金はできません。追加依頼は新規注文として相談してください。",
      };
    }

    if (status === "accepted_captured" || status === "in_progress") {
      return {
        tone: "blue" as const,
        title: "案件は進行中です",
        body: "クリエイターが制作・投稿を進めています。投稿前確認が必要な場合はチャットでやり取りしてください。",
      };
    }

    if (status === "declined_canceled" || status === "expired_canceled") {
      return {
        tone: "gray" as const,
        title: "この注文は終了しています",
        body: "クリエイター辞退または期限切れにより、請求は確定していません。",
      };
    }

    return {
      tone: "gray" as const,
      title: "注文状態を確認してください",
      body: "注文内容、決済状態、チャットを確認できます。",
    };
  }

  if (status === "authorized_pending_creator") {
    return {
      tone: "amber" as const,
      title: "Waiting for creator approval",
      body: "The payment method has been authorized. The payment will be captured if the creator accepts.",
    };
  }

  if (status === "delivered") {
    return {
      tone: "purple" as const,
      title: "Delivery URL has been submitted",
      body: "Review the delivery and complete the order if everything is okay. Revisions are only allowed within the original order requirements.",
    };
  }

  if (status === "revision_requested") {
    return {
      tone: "amber" as const,
      title: "Revision request sent",
      body: "Please wait for the creator to submit a revised delivery.",
    };
  }

  if (status === "completed") {
    return {
      tone: "green" as const,
      title: "This order is completed",
      body: "Revisions and refunds are generally unavailable after completion.",
    };
  }

  if (status === "accepted_captured" || status === "in_progress") {
    return {
      tone: "blue" as const,
      title: "This job is in progress",
      body: "The creator is working on the delivery. Use chat for optional pre-posting review.",
    };
  }

  return {
    tone: "gray" as const,
    title: "Check order status",
    body: "Review the order, payment status, and chat.",
  };
}

function CreatorAvatar({ creator }: { creator: CreatorLite | null }) {
  if (creator?.avatar_url) {
    return (
      <img
        src={creator.avatar_url}
        alt={creator.display_name ?? "creator"}
        className="h-14 w-14 rounded-2xl object-cover"
      />
    );
  }

  const initial = (creator?.display_name?.trim()?.[0] ?? "C").toUpperCase();

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700">
      {initial}
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={`max-w-[62%] text-right text-sm ${
          strong
            ? "font-black text-slate-950"
            : danger
            ? "font-black text-rose-600"
            : "font-bold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {body ? <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p> : null}
      <div className="mt-5">{children}</div>
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
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

function NoticeCard({
  tone,
  title,
  body,
}: {
  tone: "amber" | "blue" | "purple" | "green" | "gray" | "rose";
  title: string;
  body: string;
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    purple: "border-purple-200 bg-purple-50 text-purple-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gray: "border-slate-200 bg-slate-50 text-slate-800",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-[28px] border p-5 ${styles[tone]}`}>
      <p className="text-lg font-black">{title}</p>
      <p className="mt-2 text-sm leading-7">{body}</p>
    </div>
  );
}

export default function CompanyOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

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
            title: "注文詳細",
            subtitle:
              "注文内容、クリエイターの承認状況、決済状態を確認できます。",
            backJobs: "進行中案件へ戻る",
            backPending: "承認待ち一覧へ戻る",
            creatorProfile: "クリエイター詳細を見る",
            orderStatus: "注文ステータス",
            paymentStatus: "支払い状態",
            stripeStatus: "Stripe状態",
            productInfo: "商品・案件情報",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            deadline: "希望納期",
            freeOffer: "商品の無償提供",
            secondaryUse: "二次利用希望",
            yes: "あり",
            no: "なし",
            requirements: "注文内容・要件",
            menuInfo: "注文したメニュー",
            menuTitle: "メニュー名",
            platform: "SNS",
            menuType: "種別",
            category: "カテゴリー",
            price: "価格",
            deliveryDays: "想定納期",
            deliverables: "納品物",
            menuDescription: "メニュー説明",
            secondaryUseAllowed: "メニュー上の二次利用",
            allowed: "許可",
            notAllowed: "不可",
            creatorInfo: "クリエイター情報",
            creatorName: "クリエイター名",
            creatorCategory: "カテゴリー",
            lifecycle: "注文・決済情報",
            createdAt: "作成日時",
            updatedAt: "更新日時",
            authorizedAt: "与信確保日時",
            creatorDeadline: "クリエイター承認期限",
            acceptedAt: "承認日時",
            declinedAt: "辞退日時",
            expiredAt: "期限切れ日時",
            capturedAt: "決済確定日時",
            canceledAt: "取消日時",
            deliveredAt: "納品日時",
            completedAt: "完了日時",
            disputedAt: "確認開始日時",
            revisionRequestedAt: "修正依頼日時",
            revisionCount: "修正依頼回数",
            maxRevisionCount: "修正依頼上限",
            autoCompleteAt: "自動完了予定日時",
            completedReason: "完了理由",
            money: "支払い金額内訳",
            buyerPlan: "購入時プラン",
            menuPrice: "メニュー価格",
            buyerMarketplaceFee: "Trendre marketplace fee",
            buyerFeeRate: "B側手数料率",
            buyerTotal: "お支払い合計",
            stripeAmount: "Stripe決済額",
            amountNote:
              "Stripe Checkoutでは、メニュー価格にTrendre marketplace feeを加えた合計額を仮押さえしています。クリエイターが承認すると決済が確定します。",
            deliveredPostUrl: "納品URL",
            openDeliveredUrl: "納品URLを開く",
            completeTitle: "納品確認・完了",
            completeBody:
              "納品内容を確認し、問題なければ案件を完了してください。完了後は原則として修正依頼・返金はできません。",
            complete: "この案件を完了する",
            completing: "完了処理中...",
            confirmComplete:
              "この案件を完了しますか？納品内容を確認済みの場合のみ実行してください。完了後は原則として修正依頼・返金はできません。",
            completeFailed: "完了処理に失敗しました。",
            revisionTitle: "修正依頼",
            revisionBody:
              "元の注文要件に沿う範囲でのみ修正依頼できます。好みの変更、追加カット、別パターン作成、追加投稿は原則として新規注文で依頼してください。",
            revisionPlaceholder:
              "例：注文時に依頼した〇〇の表記が入っていないため、投稿文に追記してください。",
            requestRevision: "修正依頼を送信する",
            requestingRevision: "修正依頼を送信中...",
            confirmRevision:
              "修正依頼を送信しますか？元の注文要件に沿う内容の場合のみ送信してください。",
            revisionFailed: "修正依頼の送信に失敗しました。",
            revisionNoteRequired:
              "修正依頼内容は10文字以上で入力してください。",
            revisionLimitReached:
              "修正依頼の上限回数に達しています。追加修正が必要な場合はチャットで相談するか、新規注文として依頼してください。",
            revisionNoteLabel: "修正依頼内容",
            currentRevisionNote: "現在の修正依頼内容",
            ruleNotice:
              "投稿前確認はB/C間の任意チャットで行い、正式な納品は投稿後URL提出で扱います。Bが承認した後、または提出後72時間経過後は原則として修正依頼・返金はできません。",
            chatTitle: "注文チャット",
            notSet: "未設定",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            authFailed: "Could not retrieve your login session.",
            title: "Order Details",
            subtitle:
              "Review the order, creator approval status, and payment status.",
            backJobs: "Back to Active Jobs",
            backPending: "Back to Pending List",
            creatorProfile: "View Creator Profile",
            orderStatus: "Order Status",
            paymentStatus: "Payment Status",
            stripeStatus: "Stripe Status",
            productInfo: "Product / Campaign",
            productName: "Product / Campaign Name",
            productUrl: "Product URL",
            deadline: "Preferred Deadline",
            freeOffer: "Free Product Offer",
            secondaryUse: "Secondary Use Requested",
            yes: "Yes",
            no: "No",
            requirements: "Order Requirements",
            menuInfo: "Ordered Menu",
            menuTitle: "Menu Title",
            platform: "Platform",
            menuType: "Type",
            category: "Category",
            price: "Price",
            deliveryDays: "Delivery Days",
            deliverables: "Deliverables",
            menuDescription: "Menu Description",
            secondaryUseAllowed: "Secondary Use on Menu",
            allowed: "Allowed",
            notAllowed: "Not allowed",
            creatorInfo: "Creator Information",
            creatorName: "Creator Name",
            creatorCategory: "Category",
            lifecycle: "Order / Payment Information",
            createdAt: "Created At",
            updatedAt: "Updated At",
            authorizedAt: "Authorized At",
            creatorDeadline: "Creator Approval Deadline",
            acceptedAt: "Accepted At",
            declinedAt: "Declined At",
            expiredAt: "Expired At",
            capturedAt: "Captured At",
            canceledAt: "Canceled At",
            deliveredAt: "Delivered At",
            completedAt: "Completed At",
            disputedAt: "Disputed At",
            revisionRequestedAt: "Revision Requested At",
            revisionCount: "Revision Count",
            maxRevisionCount: "Revision Limit",
            autoCompleteAt: "Auto Complete At",
            completedReason: "Completed Reason",
            money: "Payment Breakdown",
            buyerPlan: "Plan at Purchase",
            menuPrice: "Menu Price",
            buyerMarketplaceFee: "Trendre marketplace fee",
            buyerFeeRate: "Buyer Fee Rate",
            buyerTotal: "Payment Total",
            stripeAmount: "Stripe Amount",
            amountNote:
              "Stripe Checkout authorizes the total of the creator menu price plus Trendre marketplace fee. The payment is captured only after the creator accepts.",
            deliveredPostUrl: "Delivered URL",
            openDeliveredUrl: "Open Delivered URL",
            completeTitle: "Review Delivery / Complete",
            completeBody:
              "Review the delivery and complete the order if everything is okay. Revisions and refunds are generally unavailable after completion.",
            complete: "Complete This Order",
            completing: "Completing...",
            confirmComplete:
              "Complete this order? Please do this only after reviewing the delivery.",
            completeFailed: "Failed to complete this order.",
            revisionTitle: "Request Revision",
            revisionBody:
              "You may request revisions only when the request is within the original order requirements. Additional work should be handled as a new order.",
            revisionPlaceholder:
              "Example: Please add the product mention that was included in the original requirements.",
            requestRevision: "Send Revision Request",
            requestingRevision: "Sending...",
            confirmRevision:
              "Send this revision request? Please make sure it is within the original order requirements.",
            revisionFailed: "Failed to send revision request.",
            revisionNoteRequired:
              "Please enter at least 10 characters for the revision request.",
            revisionLimitReached:
              "The revision request limit has been reached. Please use chat or place a new order for additional work.",
            revisionNoteLabel: "Revision Request",
            currentRevisionNote: "Current Revision Request",
            ruleNotice:
              "Pre-posting review is handled optionally through chat. Formal delivery is the submitted post/delivery URL. After buyer approval or 72 hours after submission, revisions and refunds are generally unavailable.",
            chatTitle: "Order Chat",
            notSet: "Not set",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [creator, setCreator] = useState<CreatorLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"complete" | "revision" | null>(
    null
  );
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
      setCreator(null);
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
      setCreator(null);
      setLoading(false);
      return;
    }

    const nextOrder = (data as OrderDetail | null) ?? null;
    setOrder(nextOrder);

    if (!nextOrder) {
      setCreator(null);
      setLoading(false);
      return;
    }

    const { data: creatorData, error: creatorError } = await supabase
      .from("creators")
      .select("id, display_name, avatar_url, category")
      .eq("id", nextOrder.creator_id)
      .maybeSingle();

    if (creatorError) {
      console.error("company order creator load error:", creatorError);
      setCreator(null);
    } else {
      setCreator((creatorData as CreatorLite | null) ?? null);
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
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="h-96 animate-pulse rounded-[30px] bg-slate-100" />
          <div className="h-96 animate-pulse rounded-[30px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            {error ?? copy.notFound}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/b/jobs"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.backJobs}
            </Link>

            <Link
              href="/b/requests"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:scale-[0.98]"
            >
              {copy.backPending}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = order.status === "authorized_pending_creator";
  const isDelivered = order.status === "delivered";
  const isCompleted = order.status === "completed";
  const canReviewDelivery = isDelivered && order.payment_status === "captured";
  const revisionLimitReached =
    (order.revision_count ?? 0) >= (order.max_revision_count ?? 1);
  const canRequestRevision = canReviewDelivery && !revisionLimitReached;

  const notice = getNotice(order.status, safeLocale);

  const buyerTotal =
    order.buyer_total_amount ?? order.stripe_amount ?? order.menu_price_amount;

  const buyerFee =
    order.buyer_marketplace_fee_amount ??
    Math.max(0, buyerTotal - order.menu_price_amount);

  const planName =
    order.buyer_plan_public_name_snapshot ||
    formatPlanName(order.buyer_plan_code_snapshot);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-10 md:p-6">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Company Order
        </p>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {order.product_name || copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href={isWaiting ? "/b/requests" : "/b/jobs"}
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {isWaiting ? copy.backPending : copy.backJobs}
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Pill className={statusClass(order.status)}>
            {copy.orderStatus}: {statusLabel(order.status, safeLocale)}
          </Pill>
          <Pill className={paymentStatusClass(order.payment_status)}>
            {copy.paymentStatus}: {order.payment_status}
          </Pill>
          {order.stripe_payment_status ? (
            <Pill className="bg-white/10 text-white ring-white/10">
              {copy.stripeStatus}: {order.stripe_payment_status}
            </Pill>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <NoticeCard tone={notice.tone} title={notice.title} body={notice.body} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <main className="space-y-6">
          <SectionCard title={copy.productInfo}>
            <div className="grid gap-3">
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
                      className="text-blue-600 underline underline-offset-4"
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
            </div>

            <div className="mt-4">
              <TextBlock
                label={copy.requirements}
                value={order.requirements}
                emptyLabel={copy.notSet}
              />
            </div>
          </SectionCard>

          <SectionCard title={copy.menuInfo}>
            <div className="mb-4 flex flex-wrap gap-2">
              {order.menu_platform_snapshot ? (
                <Pill className="bg-slate-950 text-white ring-slate-950">
                  <span className="mr-1">
                    {getPlatformIcon(order.menu_platform_snapshot)}
                  </span>
                  {order.menu_platform_snapshot}
                </Pill>
              ) : null}

              <Pill className="bg-slate-100 text-slate-700 ring-slate-200">
                {menuTypeLabel(
                  order.menu_type_snapshot,
                  safeLocale,
                  order.menu_category_snapshot || copy.notSet
                )}
              </Pill>

              {order.menu_category_snapshot ? (
                <Pill className="bg-purple-100 text-purple-700 ring-purple-200">
                  {order.menu_category_snapshot}
                </Pill>
              ) : null}
            </div>

            <div className="rounded-[22px] bg-slate-50 p-4">
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
            </div>

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
          </SectionCard>

          <SectionCard title={copy.lifecycle}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] bg-slate-50 p-4">
                <DetailRow
                  label={copy.createdAt}
                  value={formatDateTime(order.created_at, safeLocale)}
                />
                <DetailRow
                  label={copy.updatedAt}
                  value={formatDateTime(order.updated_at, safeLocale)}
                />
                <DetailRow
                  label={copy.authorizedAt}
                  value={formatDateTime(order.authorized_at, safeLocale)}
                />
                <DetailRow
                  label={copy.creatorDeadline}
                  value={formatDateTime(
                    order.creator_accept_deadline,
                    safeLocale
                  )}
                />
                <DetailRow
                  label={copy.acceptedAt}
                  value={formatDateTime(order.accepted_at, safeLocale)}
                />
                <DetailRow
                  label={copy.capturedAt}
                  value={formatDateTime(order.captured_at, safeLocale)}
                />
              </div>

              <div className="rounded-[22px] bg-slate-50 p-4">
                <DetailRow
                  label={copy.declinedAt}
                  value={formatDateTime(order.declined_at, safeLocale)}
                />
                <DetailRow
                  label={copy.expiredAt}
                  value={formatDateTime(order.expired_at, safeLocale)}
                />
                <DetailRow
                  label={copy.canceledAt}
                  value={formatDateTime(order.canceled_at, safeLocale)}
                />
                <DetailRow
                  label={copy.deliveredAt}
                  value={formatDateTime(order.delivered_at, safeLocale)}
                />
                <DetailRow
                  label={copy.autoCompleteAt}
                  value={formatDateTime(order.auto_complete_at, safeLocale)}
                />
                <DetailRow
                  label={copy.completedAt}
                  value={formatDateTime(order.completed_at, safeLocale)}
                />
                <DetailRow
                  label={copy.completedReason}
                  value={completedReasonLabel(order.completed_reason, safeLocale)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={copy.chatTitle}>
            <ChatEmbed orderId={order.id} title={copy.chatTitle} />
          </SectionCard>
        </main>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <SectionCard title={copy.creatorInfo}>
            <div className="flex items-center gap-4">
              <CreatorAvatar creator={creator} />
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-950">
                  {creator?.display_name || copy.notSet}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {creator?.category || copy.notSet}
                </p>
              </div>
            </div>

            {creator?.id ? (
              <Link
                href={`/b/creators/${creator.id}`}
                className="mt-5 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
              >
                {copy.creatorProfile}
              </Link>
            ) : null}
          </SectionCard>

          <SectionCard title={copy.money} body={copy.amountNote}>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <DetailRow label={copy.buyerPlan} value={planName} />
              <DetailRow
                label={copy.menuPrice}
                value={formatPrice(
                  order.menu_price_amount,
                  order.currency,
                  safeLocale
                )}
              />
              <DetailRow
                label={copy.buyerFeeRate}
                value={formatBpsPercent(order.buyer_marketplace_fee_rate_bps)}
              />
              <DetailRow
                label={copy.buyerMarketplaceFee}
                value={formatPrice(buyerFee, order.currency, safeLocale)}
              />
              <DetailRow
                label={copy.buyerTotal}
                value={formatPrice(buyerTotal, order.currency, safeLocale)}
                strong
              />
              <DetailRow
                label={copy.stripeAmount}
                value={formatPrice(order.stripe_amount, order.currency, safeLocale)}
              />
            </div>
          </SectionCard>

          {order.delivered_post_url ? (
            <SectionCard title={copy.completeTitle} body={copy.completeBody}>
              <a
                href={order.delivered_post_url}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 underline-offset-4 hover:underline"
              >
                {copy.openDeliveredUrl}
              </a>

              {canReviewDelivery ? (
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void runComplete()}
                    disabled={actionLoading !== null}
                    className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "complete"
                      ? copy.completing
                      : copy.complete}
                  </button>

                  {canRequestRevision ? (
                    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">
                        {copy.revisionTitle}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {copy.revisionBody}
                      </p>

                      <textarea
                        value={revisionNote}
                        onChange={(event) =>
                          setRevisionNote(event.target.value)
                        }
                        placeholder={copy.revisionPlaceholder}
                        rows={5}
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-950"
                      />

                      <button
                        type="button"
                        onClick={() => void runRequestRevision()}
                        disabled={actionLoading !== null}
                        className="mt-3 w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === "revision"
                          ? copy.requestingRevision
                          : copy.requestRevision}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                      {revisionLimitReached
                        ? copy.revisionLimitReached
                        : copy.ruleNotice}
                    </div>
                  )}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {order.revision_note ? (
            <SectionCard title={copy.currentRevisionNote}>
              <TextBlock
                label={copy.revisionNoteLabel}
                value={order.revision_note}
                emptyLabel={copy.notSet}
              />
              <div className="mt-4 rounded-[22px] bg-slate-50 p-4">
                <DetailRow
                  label={copy.revisionRequestedAt}
                  value={formatDateTime(order.revision_requested_at, safeLocale)}
                />
                <DetailRow
                  label={copy.revisionCount}
                  value={`${order.revision_count ?? 0}/${
                    order.max_revision_count ?? 1
                  }`}
                />
              </div>
            </SectionCard>
          ) : null}
        </aside>
      </section>
    </div>
  );
}