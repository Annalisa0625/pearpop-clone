// File: app/creator/orders/[id]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";
import DeadlineBadge from "@/app/components/DeadlineBadge";

type OrderDetail = {
  id: string;
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
  creator_transaction_fee_rate_bps: number | null;
  creator_transaction_fee_amount: number | null;
  creator_payout_amount: number | null;
  platform_gross_revenue_amount: number | null;
  creator_accept_deadline: string | null;

  authorized_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  captured_at: string | null;
  canceled_at: string | null;
  delivered_at: string | null;
  delivered_post_url: string | null;
  completed_at: string | null;

  revision_requested_at: string | null;
  revision_note: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
  completed_reason: string | null;

  transfer_status: string | null;
  stripe_transfer_id: string | null;
  transferred_at: string | null;
  transfer_attempted_at: string | null;
  transfer_failed_reason: string | null;
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
  if (value == null) {
    return locale === "ja" ? "未設定" : "Not set";
  }

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

function formatNegativePrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: "ja" | "en"
) {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";
  return `-${formatPrice(value, currency, locale)}`;
}

function formatBps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value / 100}%`;
}

function formatDeliveryDays(
  value: number | null | undefined,
  locale: "ja" | "en",
  fallback: string
) {
  if (value == null) return fallback;
  return locale === "ja" ? `${value}日` : `${value} days`;
}

function menuTypeLabel(
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
    authorized_pending_creator: "承認待ち",
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
    authorized_pending_creator: "Pending approval",
    accepted_captured: "Active",
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

  if (status === "declined_canceled" || status === "expired_canceled") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (status === "capture_failed" || status === "cancel_failed") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
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

function transferStatusLabel(value: string | null, locale: "ja" | "en") {
  const normalized = value || "not_started";

  const ja: Record<string, string> = {
    not_started: "未送金",
    pending: "送金処理中",
    transferred: "送金済み",
    failed: "送金失敗",
    skipped: "送金保留",
  };

  const en: Record<string, string> = {
    not_started: "Not started",
    pending: "Processing",
    transferred: "Transferred",
    failed: "Failed",
    skipped: "On hold",
  };

  return locale === "ja"
    ? ja[normalized] ?? normalized
    : en[normalized] ?? normalized;
}

function transferStatusClass(status: string | null) {
  if (status === "transferred") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  if (status === "pending") {
    return "bg-blue-100 text-blue-700 ring-blue-200";
  }

  if (status === "failed") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (status === "skipped") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
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
            ? "font-black text-emerald-700"
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

function ActionNotice({
  tone,
  title,
  body,
}: {
  tone: "dark" | "amber" | "blue" | "purple" | "green" | "gray";
  title: string;
  body: string;
}) {
  const styles = {
    dark: "bg-slate-950 text-white",
    amber: "bg-amber-50 text-amber-900 border border-amber-200",
    blue: "bg-blue-50 text-blue-900 border border-blue-200",
    purple: "bg-purple-50 text-purple-900 border border-purple-200",
    green: "bg-emerald-50 text-emerald-900 border border-emerald-200",
    gray: "bg-slate-50 text-slate-800 border border-slate-200",
  };

  return (
    <div className={`rounded-[28px] p-5 ${styles[tone]}`}>
      <p className="text-lg font-black">{title}</p>
      <p
        className={`mt-2 text-sm leading-7 ${
          tone === "dark" ? "text-white/70" : ""
        }`}
      >
        {body}
      </p>
    </div>
  );
}

function getMainActionTone(status: string) {
  if (status === "authorized_pending_creator") return "dark" as const;
  if (status === "revision_requested") return "amber" as const;
  if (status === "delivered") return "purple" as const;
  if (status === "completed") return "green" as const;
  if (status === "accepted_captured" || status === "in_progress") {
    return "blue" as const;
  }
  return "gray" as const;
}

export default function CreatorOrderDetailPage() {
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
            title: "案件詳細",
            subtitle:
              "注文内容を確認し、承認・納品・修正対応を行います。",
            back: "承認待ちへ戻る",
            backJobs: "進行中案件へ戻る",
            orderStatus: "注文ステータス",
            paymentStatus: "支払い状態",
            stripeStatus: "Stripe状態",
            nextAction: "次にやること",
            paymentAuthorizedTitle: "承認待ちの注文です",
            paymentAuthorized:
              "支払い方法は確認済みです。承認すると決済が確定し、案件が開始されます。",
            acceptedTitle: "納品を進めましょう",
            acceptedNotice:
              "この注文は承認済みです。制作・投稿が完了したら、納品URLを提出してください。",
            deliveredTitle: "企業の確認待ちです",
            deliveredNotice:
              "納品URLを提出済みです。企業が承認するか、提出後72時間経過すると自動完了予定です。",
            revisionRequestedTitle: "修正対応が必要です",
            revisionRequestedNotice:
              "企業から修正依頼が届いています。元の注文要件に沿う範囲で修正し、再度納品URLを提出してください。",
            completedTitle: "この注文は完了しています",
            completedNotice:
              "完了後は原則として修正依頼・返金はできません。報酬・送金状態を確認できます。",
            declinedTitle: "この注文は終了しています",
            declinedNotice:
              "この注文は辞退または期限切れです。請求は確定していません。",
            productInfo: "商品・案件情報",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            deadline: "希望納期",
            freeOffer: "商品の無償提供",
            secondaryUse: "二次利用希望",
            yes: "あり",
            no: "なし",
            requirements: "注文内容・要件",
            menuInfo: "注文されたメニュー",
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
            lifecycle: "注文・決済情報",
            createdAt: "作成日時",
            updatedAt: "更新日時",
            authorizedAt: "与信確保日時",
            creatorDeadline: "承認期限",
            acceptedAt: "承認日時",
            declinedAt: "辞退日時",
            capturedAt: "決済確定日時",
            canceledAt: "取消日時",
            deliveredAt: "納品日時",
            completedAt: "完了日時",
            revisionRequestedAt: "修正依頼日時",
            revisionCount: "修正依頼回数",
            autoCompleteAt: "自動完了予定日時",
            completedReason: "完了理由",
            payoutInfo: "報酬・送金",
            payoutInfoBody:
              "Trendre手数料を差し引いた受取予定額と、Stripe Connectによる送金状態を確認できます。",
            menuPrice: "メニュー価格",
            creatorTransactionFeeRate: "C側手数料率",
            creatorTransactionFee: "Trendre手数料",
            creatorPayout: "受取予定額",
            transferStatus: "送金状態",
            transferredAt: "送金日時",
            transferAttemptedAt: "送金処理日時",
            transferId: "Transfer ID",
            transferFailedReason: "送金失敗理由",
            payoutHistory: "報酬・送金履歴を見る",
            payoutTransferredBody:
              "この注文の報酬はStripe Connectで送金済みです。",
            payoutPendingBody:
              "この注文は完了済みですが、送金処理はまだ完了していません。通常は日次の自動処理で反映されます。",
            payoutNotCompletedBody:
              "注文が完了すると、受取予定額と送金状態が確定します。",
            revisionInfoTitle: "修正依頼内容",
            revisionInfoBody:
              "企業から届いた修正依頼です。元の注文要件に沿う範囲で対応してください。",
            deliveryTitle: "納品URLを提出",
            redeliveryTitle: "修正版の納品URLを提出",
            deliveryBody:
              "投稿URL、成果物URL、Google Drive URLなど、企業が確認できるURLを入力してください。",
            redeliveryBody:
              "修正対応後の投稿URL、成果物URL、Google Drive URLなど、企業が確認できるURLを入力してください。",
            deliveredPostUrl: "納品URL",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "納品URLを開く",
            deliver: "納品URLを提出する",
            redeliver: "修正版の納品URLを提出する",
            updateDelivery: "納品URLを更新する",
            delivering: "納品中...",
            deliveryRequired: "納品URLを入力してください。",
            deliveryFailed: "納品処理に失敗しました。",
            accept: "この注文を承認する",
            decline: "この注文を辞退する",
            accepting: "承認処理中...",
            declining: "辞退処理中...",
            confirmAccept:
              "この注文を承認しますか？承認するとStripeで決済が確定します。",
            confirmDecline:
              "この注文を辞退しますか？辞退するとカード与信は取り消され、請求は確定しません。",
            confirmDeliver: "このURLで納品しますか？",
            confirmRedeliver: "このURLで修正版を再納品しますか？",
            acceptFailed: "承認処理に失敗しました。",
            declineFailed: "辞退処理に失敗しました。",
            authFailed: "ログイン情報を取得できませんでした。",
            chatTitle: "注文チャット",
            notSet: "未設定",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            title: "Job Details",
            subtitle:
              "Review this order, accept or decline it, deliver work, and handle revision requests.",
            back: "Back to Pending",
            backJobs: "Back to Jobs",
            orderStatus: "Order Status",
            paymentStatus: "Payment Status",
            stripeStatus: "Stripe Status",
            nextAction: "Next action",
            paymentAuthorizedTitle: "This order is waiting for approval",
            paymentAuthorized:
              "The payment method has been authorized. Accepting this order will capture the payment.",
            acceptedTitle: "Prepare your delivery",
            acceptedNotice:
              "This order has been accepted and captured. Submit your delivery URL when the work is ready.",
            deliveredTitle: "Waiting for buyer review",
            deliveredNotice:
              "Delivery URL has been submitted. It will be auto-completed 72 hours after delivery if the buyer takes no action.",
            revisionRequestedTitle: "Revision requested",
            revisionRequestedNotice:
              "The company requested a revision. Please revise within the original order requirements and resubmit a delivery URL.",
            completedTitle: "This order is completed",
            completedNotice:
              "This order has been completed. Revisions and refunds are generally unavailable after completion.",
            declinedTitle: "This order is closed",
            declinedNotice:
              "This order has been declined or expired. The charge was not finalized.",
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
            lifecycle: "Order / Payment Information",
            createdAt: "Created At",
            updatedAt: "Updated At",
            authorizedAt: "Authorized At",
            creatorDeadline: "Approval Deadline",
            acceptedAt: "Accepted At",
            declinedAt: "Declined At",
            capturedAt: "Captured At",
            canceledAt: "Canceled At",
            deliveredAt: "Delivered At",
            completedAt: "Completed At",
            revisionRequestedAt: "Revision Requested At",
            revisionCount: "Revision Count",
            autoCompleteAt: "Auto Complete At",
            completedReason: "Completed Reason",
            payoutInfo: "Payout & Transfer",
            payoutInfoBody:
              "Review your estimated payout after the Trendre transaction fee and the Stripe Connect transfer status.",
            menuPrice: "Menu Price",
            creatorTransactionFeeRate: "Creator Fee Rate",
            creatorTransactionFee: "Trendre fee",
            creatorPayout: "Estimated Payout",
            transferStatus: "Transfer Status",
            transferredAt: "Transferred At",
            transferAttemptedAt: "Transfer Attempted At",
            transferId: "Transfer ID",
            transferFailedReason: "Transfer Failure Reason",
            payoutHistory: "View payout history",
            payoutTransferredBody:
              "The payout for this order has been transferred through Stripe Connect.",
            payoutPendingBody:
              "This order is completed, but the payout transfer has not completed yet. It is usually processed by the daily automated job.",
            payoutNotCompletedBody:
              "Once this order is completed, the payout amount and transfer status will be finalized.",
            revisionInfoTitle: "Revision Request",
            revisionInfoBody:
              "This is the revision request from the company. Please revise within the original order requirements.",
            deliveryTitle: "Submit Delivery URL",
            redeliveryTitle: "Submit Revised Delivery URL",
            deliveryBody:
              "Enter a URL the company can review, such as a post URL, deliverable URL, or Google Drive URL.",
            redeliveryBody: "Enter the revised URL the company can review.",
            deliveredPostUrl: "Delivery URL",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "Open Delivery URL",
            deliver: "Submit Delivery URL",
            redeliver: "Submit Revised Delivery URL",
            updateDelivery: "Update Delivery URL",
            delivering: "Submitting...",
            deliveryRequired: "Please enter a delivery URL.",
            deliveryFailed: "Failed to submit delivery.",
            accept: "Accept This Order",
            decline: "Decline This Order",
            accepting: "Accepting...",
            declining: "Declining...",
            confirmAccept:
              "Accept this order? The Stripe payment will be captured.",
            confirmDecline:
              "Decline this order? The card authorization will be canceled and the charge will not be finalized.",
            confirmDeliver: "Submit this URL as the delivery?",
            confirmRedeliver: "Submit this URL as the revised delivery?",
            acceptFailed: "Failed to accept this order.",
            declineFailed: "Failed to decline this order.",
            authFailed: "Could not retrieve your login session.",
            chatTitle: "Order Chat",
            notSet: "Not set",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "accept" | "decline" | "deliver" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(copy.authFailed);
      setLoading(false);
      return;
    }

    const { data, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
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
        creator_transaction_fee_rate_bps,
        creator_transaction_fee_amount,
        creator_payout_amount,
        platform_gross_revenue_amount,
        creator_accept_deadline,
        authorized_at,
        accepted_at,
        declined_at,
        captured_at,
        canceled_at,
        delivered_at,
        delivered_post_url,
        completed_at,
        revision_requested_at,
        revision_note,
        revision_count,
        max_revision_count,
        auto_complete_at,
        completed_reason,
        transfer_status,
        stripe_transfer_id,
        transferred_at,
        transfer_attempted_at,
        transfer_failed_reason
      `
      )
      .eq("id", orderId)
      .eq("creator_user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("creator order detail load error:", orderError);
      setError(copy.notFound);
      setOrder(null);
      setLoading(false);
      return;
    }

    const nextOrder = (data as OrderDetail | null) ?? null;

    setOrder(nextOrder);
    setDeliveryUrl(nextOrder?.delivered_post_url ?? "");
    setLoading(false);
  }, [copy.authFailed, copy.notFound, orderId, supabase]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const runAction = async (type: "accept" | "decline") => {
    if (!order) return;

    const confirmMessage =
      type === "accept" ? copy.confirmAccept : copy.confirmDecline;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(type);
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
      const res = await fetch(`/api/creator/orders/${order.id}/${type}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          json?.error ??
            (type === "accept" ? copy.acceptFailed : copy.declineFailed)
        );
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(
        e?.message ??
          (type === "accept" ? copy.acceptFailed : copy.declineFailed)
      );
      setActionLoading(null);
    }
  };

  const runDeliver = async () => {
    if (!order) return;

    const cleanUrl = deliveryUrl.trim();

    if (!cleanUrl) {
      setError(copy.deliveryRequired);
      return;
    }

    const confirmMessage =
      order.status === "revision_requested"
        ? copy.confirmRedeliver
        : copy.confirmDeliver;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading("deliver");
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
      const res = await fetch(`/api/creator/orders/${order.id}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          delivered_post_url: cleanUrl,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error ?? copy.deliveryFailed);
        setActionLoading(null);
        return;
      }

      await loadOrder();
      setActionLoading(null);
    } catch (e: any) {
      setError(e?.message ?? copy.deliveryFailed);
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-64 animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">{copy.notFound}</p>
        <Link
          href="/creator/requests"
          className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          {copy.back}
        </Link>
      </div>
    );
  }

  const storedCreatorTransactionFeeRateBps =
    order.creator_transaction_fee_rate_bps ?? 1500;

  const menuPriceAmount = Number(order.menu_price_amount ?? 0);

  const fallbackCreatorTransactionFeeAmount = Math.floor(
    (menuPriceAmount * storedCreatorTransactionFeeRateBps) / 10000
  );

  const creatorPayoutAmount =
    order.creator_payout_amount != null
      ? order.creator_payout_amount
      : Math.max(0, menuPriceAmount - fallbackCreatorTransactionFeeAmount);

  const creatorTransactionFeeAmount =
    order.creator_transaction_fee_amount != null &&
    order.creator_transaction_fee_amount > 0
      ? order.creator_transaction_fee_amount
      : Math.max(0, menuPriceAmount - creatorPayoutAmount);

  const effectiveCreatorTransactionFeeRateBps =
    menuPriceAmount > 0
      ? Math.round((creatorTransactionFeeAmount / menuPriceAmount) * 10000)
      : storedCreatorTransactionFeeRateBps;

  const displayCreatorTransactionFeeRateBps =
    order.creator_transaction_fee_amount != null &&
    order.creator_transaction_fee_amount > 0
      ? storedCreatorTransactionFeeRateBps
      : effectiveCreatorTransactionFeeRateBps;

  const canAct =
    order.status === "authorized_pending_creator" &&
    order.payment_status === "authorized";

  const canDeliver =
    [
      "accepted_captured",
      "in_progress",
      "delivered",
      "revision_requested",
    ].includes(order.status) && order.payment_status === "captured";

  const isRevisionRequested = order.status === "revision_requested";
  const isCompleted = order.status === "completed";
  const isTransferred = order.transfer_status === "transferred";

  const payoutNoticeBody = !isCompleted
    ? copy.payoutNotCompletedBody
    : isTransferred
    ? copy.payoutTransferredBody
    : copy.payoutPendingBody;

  const actionTone = getMainActionTone(order.status);

  const mainActionTitle =
    order.status === "authorized_pending_creator"
      ? copy.paymentAuthorizedTitle
      : order.status === "revision_requested"
      ? copy.revisionRequestedTitle
      : order.status === "delivered"
      ? copy.deliveredTitle
      : order.status === "completed"
      ? copy.completedTitle
      : order.status === "accepted_captured" || order.status === "in_progress"
      ? copy.acceptedTitle
      : copy.declinedTitle;

  const mainActionBody =
    order.status === "authorized_pending_creator"
      ? copy.paymentAuthorized
      : order.status === "revision_requested"
      ? copy.revisionRequestedNotice
      : order.status === "delivered"
      ? copy.deliveredNotice
      : order.status === "completed"
      ? copy.completedNotice
      : order.status === "accepted_captured" || order.status === "in_progress"
      ? copy.acceptedNotice
      : copy.declinedNotice;

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-[32px] bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/50">
          Creator Order
        </p>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {order.product_name || copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              {copy.subtitle}
            </p>
          </div>

          <Link
            href={
              order.status === "authorized_pending_creator"
                ? "/creator/requests"
                : "/creator/jobs"
            }
            className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
          >
            {order.status === "authorized_pending_creator"
              ? copy.back
              : copy.backJobs}
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Pill className={statusClass(order.status)}>
            {statusLabel(order.status, safeLocale)}
          </Pill>
          <Pill className="bg-white/10 text-white ring-white/10">
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

      <ActionNotice tone={actionTone} title={mainActionTitle} body={mainActionBody} />

      {canAct ? (
        <section className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void runAction("accept")}
            disabled={actionLoading !== null}
            className="rounded-[24px] bg-slate-950 px-5 py-4 text-base font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "accept" ? copy.accepting : copy.accept}
          </button>

          <button
            type="button"
            onClick={() => void runAction("decline")}
            disabled={actionLoading !== null}
            className="rounded-[24px] border border-rose-200 bg-white px-5 py-4 text-base font-black text-rose-600 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "decline" ? copy.declining : copy.decline}
          </button>
        </section>
      ) : null}

      {isRevisionRequested && order.revision_note ? (
        <SectionCard title={copy.revisionInfoTitle} body={copy.revisionInfoBody}>
          <TextBlock
            label={copy.revisionInfoTitle}
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
              value={`${order.revision_count ?? 0}/${order.max_revision_count ?? 1}`}
            />
          </div>
        </SectionCard>
      ) : null}

      {canDeliver ? (
        <SectionCard
          title={isRevisionRequested ? copy.redeliveryTitle : copy.deliveryTitle}
          body={isRevisionRequested ? copy.redeliveryBody : copy.deliveryBody}
        >
          <input
            type="url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder={copy.deliveredPostUrlPlaceholder}
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none transition focus:border-slate-950"
          />

          {order.delivered_post_url ? (
            <a
              href={order.delivered_post_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 underline-offset-4 hover:underline"
            >
              {copy.openDeliveredUrl}
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => void runDeliver()}
            disabled={actionLoading !== null}
            className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "deliver"
              ? copy.delivering
              : isRevisionRequested
              ? copy.redeliver
              : order.delivered_post_url
              ? copy.updateDelivery
              : copy.deliver}
          </button>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                  value={formatDateTime(order.creator_accept_deadline, safeLocale)}
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
                  label={copy.canceledAt}
                  value={formatDateTime(order.canceled_at, safeLocale)}
                />
                <DetailRow
                  label={copy.deliveredAt}
                  value={formatDateTime(order.delivered_at, safeLocale)}
                />
                <DetailRow
                  label={copy.autoCompleteAt}
                  value={
                    order.auto_complete_at ? (
                      <DeadlineBadge
                        deadline={order.auto_complete_at}
                        label={copy.autoCompleteAt}
                        expiredLabel={copy.autoCompleteAt}
                        locale={safeLocale}
                        urgentHours={12}
                        warningHours={24}
                      />
                    ) : (
                      "-"
                    )
                  }
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
        </main>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <SectionCard title={copy.payoutInfo} body={copy.payoutInfoBody}>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <DetailRow
                label={copy.menuPrice}
                value={formatPrice(order.menu_price_amount, order.currency, safeLocale)}
              />
              <DetailRow
                label={copy.creatorTransactionFeeRate}
                value={formatBps(displayCreatorTransactionFeeRateBps)}
              />
              <DetailRow
                label={copy.creatorTransactionFee}
                value={formatNegativePrice(
                  creatorTransactionFeeAmount,
                  order.currency,
                  safeLocale
                )}
                danger
              />
              <DetailRow
                label={copy.creatorPayout}
                value={formatPrice(creatorPayoutAmount, order.currency, safeLocale)}
                strong
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill className={transferStatusClass(order.transfer_status)}>
                {transferStatusLabel(order.transfer_status, safeLocale)}
              </Pill>
            </div>

            <div className="mt-4 rounded-[22px] bg-slate-50 p-4">
              <DetailRow
                label={copy.transferredAt}
                value={formatDateTime(order.transferred_at, safeLocale)}
              />
              <DetailRow
                label={copy.transferAttemptedAt}
                value={formatDateTime(order.transfer_attempted_at, safeLocale)}
              />
              <DetailRow
                label={copy.transferId}
                value={shortId(order.stripe_transfer_id)}
              />
              {order.transfer_failed_reason ? (
                <DetailRow
                  label={copy.transferFailedReason}
                  value={order.transfer_failed_reason}
                />
              ) : null}
            </div>

            <div className="mt-4 rounded-[22px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              {payoutNoticeBody}
            </div>

            <Link
              href="/creator/payouts"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.payoutHistory}
            </Link>
          </SectionCard>
        </aside>
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">{copy.chatTitle}</h2>
        <ChatEmbed orderId={order.id} title={copy.chatTitle} />
      </section>
    </div>
  );
}