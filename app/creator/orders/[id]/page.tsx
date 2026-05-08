// File: app/creator/orders/[id]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";

type OrderDetail = {
  id: string;
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatPrice(
  value: number | null,
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
    if (safeCurrency === "USD") {
      return `$${value.toLocaleString()}`;
    }

    return `¥${value.toLocaleString()}`;
  }
}

function formatBps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value / 100}%`;
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

function statusLabel(status: string, locale: "ja" | "en") {
  const ja: Record<string, string> = {
    checkout_pending: "Checkout未完了",
    authorized_pending_creator: "承認待ち",
    accepted_captured: "承認済み・決済確定",
    declined_canceled: "辞退済み・請求取消",
    expired_canceled: "期限切れ・請求取消",
    capture_failed: "決済確定失敗",
    cancel_failed: "取消失敗",
    in_progress: "進行中",
    delivered: "納品済み",
    revision_requested: "修正依頼中",
    completed: "完了",
    disputed: "異議・確認中",
  };

  const en: Record<string, string> = {
    checkout_pending: "Checkout pending",
    authorized_pending_creator: "Pending approval",
    accepted_captured: "Accepted / Captured",
    declined_canceled: "Declined / Canceled",
    expired_canceled: "Expired / Canceled",
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

function statusClass(status: string) {
  if (status === "authorized_pending_creator") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "accepted_captured" || status === "in_progress") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "delivered") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }

  if (status === "revision_requested") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "completed") {
    return "bg-gray-50 text-gray-700 ring-gray-200";
  }

  if (status === "declined_canceled" || status === "expired_canceled") {
    return "bg-gray-50 text-gray-700 ring-gray-200";
  }

  if (status === "capture_failed" || status === "cancel_failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
}

function transferStatusClass(status: string | null) {
  if (status === "transferred") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "pending") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "skipped") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-2 whitespace-pre-line text-sm font-semibold text-gray-900">
        {value ?? "-"}
      </div>
    </div>
  );
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
            title: "注文詳細",
            subtitle:
              "企業から届いた注文内容を確認し、承認・納品・修正対応を行えます。",
            back: "承認待ち一覧へ戻る",
            backJobs: "進行中案件へ戻る",
            orderStatus: "注文ステータス",
            paymentStatus: "支払い状態",
            stripeStatus: "Stripe状態",
            paymentAuthorized:
              "支払い方法は確認済みです。承認すると決済が確定します。",
            acceptedNotice:
              "この注文は承認済みです。決済は確定しています。納品URLを提出してください。投稿前確認が必要な場合はチャットでやり取りしてください。",
            deliveredNotice:
              "納品URLを提出済みです。企業側の確認・完了待ちです。提出後72時間経過すると自動完了予定です。",
            revisionRequestedNotice:
              "企業から修正依頼が届いています。元の注文要件に沿う範囲で修正し、再度納品URLを提出してください。",
            completedNotice:
              "この注文は完了しています。完了後は原則として修正依頼・返金はできません。",
            declinedNotice:
              "この注文は辞退済みです。請求は確定していません。",
            productInfo: "商品・案件情報",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            deadline: "希望納期",
            freeOffer: "商品の無償提供",
            secondaryUse: "二次利用希望",
            yes: "あり",
            no: "なし",
            requirements: "注文内容・requirements",
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
            payoutInfo: "報酬・送金情報",
            payoutInfoBody:
              "Trendre transaction feeを差し引いた受取予定額と、Stripe Connectによる送金状態を確認できます。",
            menuPrice: "メニュー価格",
            creatorTransactionFeeRate: "C側手数料率",
            creatorTransactionFee: "Trendre transaction fee",
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
              "企業から届いた修正依頼です。元の注文要件に沿う範囲で対応してください。追加作業や別パターン作成はチャットで相談してください。",
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
            title: "Order Details",
            subtitle:
              "Review this order, accept or decline it, deliver work, and handle revision requests.",
            back: "Back to Pending List",
            backJobs: "Back to Active Jobs",
            orderStatus: "Order Status",
            paymentStatus: "Payment Status",
            stripeStatus: "Stripe Status",
            paymentAuthorized:
              "The payment method has been authorized. Accepting this order will capture the payment.",
            acceptedNotice:
              "This order has been accepted and captured. Please submit your delivery URL. Use chat for optional pre-posting review.",
            deliveredNotice:
              "Delivery URL has been submitted. Waiting for the company to review and complete. It is scheduled to auto-complete 72 hours after delivery.",
            revisionRequestedNotice:
              "The company requested a revision. Please revise within the original order requirements and resubmit a delivery URL.",
            completedNotice:
              "This order has been completed. Revisions and refunds are generally unavailable after completion.",
            declinedNotice:
              "This order has been declined. The charge was not finalized.",
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
            creatorTransactionFee: "Trendre transaction fee",
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
    return <div className="p-6">{copy.loading}</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">{copy.notFound}</p>
          <Link
            href="/creator/requests"
            className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline"
          >
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

     const storedCreatorTransactionFeeRateBps =
    order.creator_transaction_fee_rate_bps ?? 1500;

  const fallbackCreatorTransactionFeeAmount = Math.floor(
    (order.menu_price_amount * storedCreatorTransactionFeeRateBps) / 10000
  );

  const creatorPayoutAmount =
    order.creator_payout_amount != null
      ? order.creator_payout_amount
      : Math.max(
          0,
          order.menu_price_amount - fallbackCreatorTransactionFeeAmount
        );

  const creatorTransactionFeeAmount =
    order.creator_transaction_fee_amount != null &&
    order.creator_transaction_fee_amount > 0
      ? order.creator_transaction_fee_amount
      : Math.max(0, order.menu_price_amount - creatorPayoutAmount);

  const effectiveCreatorTransactionFeeRateBps =
    order.menu_price_amount > 0
      ? Math.round(
          (creatorTransactionFeeAmount / order.menu_price_amount) * 10000
        )
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/creator/requests"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← {copy.back}
          </Link>

          <Link
            href="/creator/jobs"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {copy.backJobs}
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-green-600">
              Trendre Orders
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {copy.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                order.status
              )}`}
            >
              {statusLabel(order.status, safeLocale)}
            </span>

            <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
              {order.payment_status}
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${transferStatusClass(
                order.transfer_status
              )}`}
            >
              {transferStatusLabel(order.transfer_status, safeLocale)}
            </span>
          </div>
        </div>
      </section>

      {order.status === "authorized_pending_creator" ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
          {copy.paymentAuthorized}
        </section>
      ) : null}

      {order.status === "accepted_captured" || order.status === "in_progress" ? (
        <section className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm leading-7 text-green-800">
          {copy.acceptedNotice}
        </section>
      ) : null}

      {order.status === "delivered" ? (
        <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-7 text-indigo-800">
          {copy.deliveredNotice}
        </section>
      ) : null}

      {isRevisionRequested ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          {copy.revisionRequestedNotice}
        </section>
      ) : null}

      {order.status === "completed" ? (
        <section className="rounded-3xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
          {copy.completedNotice}
        </section>
      ) : null}

      {order.status === "declined_canceled" ? (
        <section className="rounded-3xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
          {copy.declinedNotice}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700">
          {error}
        </section>
      ) : null}

      {order.revision_note ? (
        <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-amber-900">
            {copy.revisionInfoTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            {copy.revisionInfoBody}
          </p>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4">
            <p className="whitespace-pre-line text-sm leading-7 text-amber-900">
              {order.revision_note}
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.productInfo}</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={copy.productName} value={order.product_name} />

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.productUrl}
                </p>
                {order.product_url ? (
                  <a
                    href={order.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {order.product_url}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-gray-900">-</p>
                )}
              </div>

              <Field
                label={copy.deadline}
                value={formatDate(order.deadline, safeLocale)}
              />

              <Field
                label={copy.freeOffer}
                value={order.has_free_offer ? copy.yes : copy.no}
              />

              <Field
                label={copy.secondaryUse}
                value={order.wants_secondary_use ? copy.yes : copy.no}
              />
            </div>

            <div className="mt-5 rounded-2xl border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {copy.requirements}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                {order.requirements}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.menuInfo}</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={copy.menuTitle} value={order.menu_title_snapshot} />

              <Field
                label={copy.platform}
                value={order.menu_platform_snapshot ?? copy.notSet}
              />

              <Field
                label={copy.menuType}
                value={menuTypeLabel(
                  order.menu_type_snapshot,
                  safeLocale,
                  copy.notSet
                )}
              />

              <Field
                label={copy.category}
                value={order.menu_category_snapshot ?? copy.notSet}
              />

              <Field
                label={copy.price}
                value={formatPrice(
                  order.menu_price_amount,
                  order.currency,
                  safeLocale
                )}
              />

              <Field
                label={copy.deliveryDays}
                value={formatDeliveryDays(
                  order.menu_delivery_days_snapshot,
                  safeLocale,
                  copy.notSet
                )}
              />

              <Field
                label={copy.secondaryUseAllowed}
                value={
                  order.menu_allow_secondary_use_snapshot
                    ? copy.allowed
                    : copy.notAllowed
                }
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.deliverables}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                  {order.menu_deliverables_snapshot || "-"}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.menuDescription}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
                  {order.menu_description_snapshot || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.lifecycle}</h2>

            <div className="mt-5 space-y-3">
              <Field
                label={copy.orderStatus}
                value={statusLabel(order.status, safeLocale)}
              />

              <Field label={copy.paymentStatus} value={order.payment_status} />

              <Field
                label={copy.stripeStatus}
                value={order.stripe_payment_status ?? "-"}
              />

              <Field
                label={copy.createdAt}
                value={formatDateTime(order.created_at, safeLocale)}
              />

              <Field
                label={copy.updatedAt}
                value={formatDateTime(order.updated_at, safeLocale)}
              />

              <Field
                label={copy.authorizedAt}
                value={formatDateTime(order.authorized_at, safeLocale)}
              />

              <Field
                label={copy.creatorDeadline}
                value={formatDateTime(
                  order.creator_accept_deadline,
                  safeLocale
                )}
              />

              <Field
                label={copy.acceptedAt}
                value={formatDateTime(order.accepted_at, safeLocale)}
              />

              <Field
                label={copy.declinedAt}
                value={formatDateTime(order.declined_at, safeLocale)}
              />

              <Field
                label={copy.capturedAt}
                value={formatDateTime(order.captured_at, safeLocale)}
              />

              <Field
                label={copy.canceledAt}
                value={formatDateTime(order.canceled_at, safeLocale)}
              />

              <Field
                label={copy.deliveredAt}
                value={formatDateTime(order.delivered_at, safeLocale)}
              />

              <Field
                label={copy.revisionRequestedAt}
                value={formatDateTime(order.revision_requested_at, safeLocale)}
              />

              <Field
                label={copy.revisionCount}
                value={`${order.revision_count ?? 0} / ${
                  order.max_revision_count ?? 1
                }`}
              />

              <Field
                label={copy.autoCompleteAt}
                value={formatDateTime(order.auto_complete_at, safeLocale)}
              />

              <Field
                label={copy.completedAt}
                value={formatDateTime(order.completed_at, safeLocale)}
              />

              <Field
                label={copy.completedReason}
                value={completedReasonLabel(
                  order.completed_reason,
                  safeLocale
                )}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.payoutInfo}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {copy.payoutInfoBody}
            </p>

            <div className="mt-5 rounded-2xl border bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {payoutNoticeBody}
            </div>

            <div className="mt-5 space-y-3">
              <Field
                label={copy.menuPrice}
                value={formatPrice(
                  order.menu_price_amount,
                  order.currency,
                  safeLocale
                )}
              />
              <Field
                label={copy.creatorTransactionFeeRate}
                value={formatBps(displayCreatorTransactionFeeRateBps)}
              />

              <Field
                label={copy.creatorTransactionFee}
                value={`-${formatPrice(
                  creatorTransactionFeeAmount,
                  order.currency,
                  safeLocale
                )}`}
              />

              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  {copy.creatorPayout}
                </p>
                <p className="mt-2 text-2xl font-bold text-green-900">
                  {formatPrice(creatorPayoutAmount, order.currency, safeLocale)}
                </p>
              </div>

              <Field
                label={copy.transferStatus}
                value={
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${transferStatusClass(
                      order.transfer_status
                    )}`}
                  >
                    {transferStatusLabel(order.transfer_status, safeLocale)}
                  </span>
                }
              />

              <Field
                label={copy.transferredAt}
                value={formatDateTime(order.transferred_at, safeLocale)}
              />

              <Field
                label={copy.transferAttemptedAt}
                value={formatDateTime(order.transfer_attempted_at, safeLocale)}
              />

              <Field
                label={copy.transferId}
                value={shortId(order.stripe_transfer_id)}
              />

              {order.transfer_failed_reason ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    {copy.transferFailedReason}
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold text-red-900">
                    {order.transfer_failed_reason}
                  </p>
                </div>
              ) : null}

              <Link
                href="/creator/payouts"
                className="inline-flex w-full items-center justify-center rounded-2xl border px-5 py-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {copy.payoutHistory}
              </Link>
            </div>
          </div>

          {canAct ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => runAction("accept")}
                  className="w-full rounded-2xl bg-green-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "accept" ? copy.accepting : copy.accept}
                </button>

                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => runAction("decline")}
                  className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "decline" ? copy.declining : copy.decline}
                </button>
              </div>
            </div>
          ) : null}

          {canDeliver ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                {isRevisionRequested ? copy.redeliveryTitle : copy.deliveryTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {isRevisionRequested ? copy.redeliveryBody : copy.deliveryBody}
              </p>

              <div className="mt-5">
                <label className="mb-1 block text-sm font-semibold">
                  {copy.deliveredPostUrl}
                </label>
                <input
                  type="url"
                  value={deliveryUrl}
                  onChange={(e) => setDeliveryUrl(e.target.value)}
                  placeholder={copy.deliveredPostUrlPlaceholder}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-gray-900"
                />
              </div>

              {order.delivered_post_url ? (
                <a
                  href={order.delivered_post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline"
                >
                  {copy.openDeliveredUrl}
                </a>
              ) : null}

              <button
                type="button"
                disabled={actionLoading === "deliver"}
                onClick={runDeliver}
                className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRevisionRequested
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {actionLoading === "deliver"
                  ? copy.delivering
                  : isRevisionRequested
                    ? copy.redeliver
                    : order.status === "delivered"
                      ? copy.updateDelivery
                      : copy.deliver}
              </button>
            </div>
          ) : null}
        </aside>
      </section>

      <ChatEmbed orderId={order.id} title={copy.chatTitle} />
    </div>
  );
}