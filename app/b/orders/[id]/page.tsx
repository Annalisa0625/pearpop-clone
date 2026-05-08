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
    if (safeCurrency === "USD") {
      return `$${value.toLocaleString()}`;
    }

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

function formatPlanName(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const normalized = value.toLowerCase();

  if (normalized === "basic" || normalized === "free") {
    return "Basic";
  }

  if (normalized === "pro" || normalized === "standard") {
    return "Pro";
  }

  if (normalized === "premium" || normalized === "global_pro") {
    return "Premium";
  }

  return locale === "ja" ? value : value;
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
    authorized_pending_creator: "クリエイター承認待ち",
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
    authorized_pending_creator: "Waiting for creator approval",
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

  if (
    status === "declined_canceled" ||
    status === "expired_canceled" ||
    status === "capture_failed" ||
    status === "cancel_failed" ||
    status === "disputed"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
}

function paymentStatusClass(paymentStatus: string) {
  if (paymentStatus === "authorized") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (paymentStatus === "captured") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (paymentStatus === "canceled") {
    return "bg-gray-50 text-gray-700 ring-gray-200";
  }

  if (paymentStatus === "failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold text-gray-900">
        {value ?? "-"}
      </p>
    </div>
  );
}

function CreatorAvatar({ creator }: { creator: CreatorLite | null }) {
  if (creator?.avatar_url) {
    return (
      <img
        src={creator.avatar_url}
        alt={creator.display_name ?? "creator"}
        className="h-14 w-14 rounded-full object-cover"
      />
    );
  }

  const initial = (creator?.display_name?.trim()?.[0] ?? "C").toUpperCase();

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-700">
      {initial}
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
            waitingNotice:
              "支払い方法は確認済みです。クリエイターが承認すると決済が確定します。",
            acceptedNotice:
              "クリエイターが承認済みです。決済は確定しています。投稿前確認が必要な場合はチャットでやり取りしてください。",
            revisionRequestedNotice:
              "修正依頼を送信済みです。クリエイターの再納品をお待ちください。",
            declinedNotice:
              "クリエイターが辞退したため、請求は確定していません。",
            canceledNotice:
              "この注文は取消済みです。請求は確定していません。",
            deliveredNotice:
              "クリエイターから納品URLが提出されています。内容を確認し、問題なければ完了してください。元の注文要件に沿う範囲でのみ修正依頼できます。",
            completedNotice:
              "この注文は完了しています。完了後は原則として修正依頼・返金はできません。追加依頼は新規注文として相談してください。",
            productInfo: "商品・案件情報",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            deadline: "希望納期",
            freeOffer: "商品の無償提供",
            secondaryUse: "二次利用希望",
            yes: "あり",
            no: "なし",
            requirements: "注文内容・requirements",
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
            waitingNotice:
              "The payment method has been authorized. The payment will be captured if the creator accepts.",
            acceptedNotice:
              "The creator has accepted this order. The payment has been captured. Use chat for optional pre-posting review.",
            revisionRequestedNotice:
              "A revision request has been sent. Please wait for the creator to resubmit.",
            declinedNotice:
              "The creator declined this order. The charge was not finalized.",
            canceledNotice:
              "This order has been canceled. The charge was not finalized.",
            deliveredNotice:
              "The creator has submitted a delivery URL. Please review it and complete the order if everything is okay. Revisions are only allowed within the original order requirements.",
            completedNotice:
              "This order has been completed. Revisions and refunds are generally not available after completion.",
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
    } catch (e: any) {
      setError(e?.message ?? copy.completeFailed);
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
    } catch (e: any) {
      setError(e?.message ?? copy.revisionFailed);
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
          <p className="text-sm text-gray-600">{error ?? copy.notFound}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/b/jobs"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copy.backJobs}
            </Link>

            <Link
              href="/b/requests"
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.backPending}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = order.status === "authorized_pending_creator";
  const isAccepted =
    order.status === "accepted_captured" || order.status === "in_progress";
  const isDeclined =
    order.status === "declined_canceled" ||
    order.status === "expired_canceled" ||
    order.status === "cancel_failed";
  const isDelivered = order.status === "delivered";
  const isRevisionRequested = order.status === "revision_requested";
  const isCompleted = order.status === "completed";

  const revisionCount = Number(order.revision_count ?? 0);
  const maxRevisionCount = Number(order.max_revision_count ?? 1);
  const canRequestRevision =
    order.status === "delivered" &&
    order.payment_status === "captured" &&
    !!order.delivered_post_url &&
    revisionCount < maxRevisionCount;

  const canComplete =
    order.status === "delivered" &&
    order.payment_status === "captured" &&
    !!order.delivered_post_url;

  const menuPriceAmount = Number(order.menu_price_amount ?? 0);
  const stripeAmount = Number(order.stripe_amount ?? 0);

  const fallbackBuyerMarketplaceFeeAmount = Math.max(
    0,
    stripeAmount - menuPriceAmount
  );

  const buyerTotalAmount =
    order.buyer_total_amount != null && order.buyer_total_amount > 0
      ? order.buyer_total_amount
      : stripeAmount > 0
        ? stripeAmount
        : menuPriceAmount + fallbackBuyerMarketplaceFeeAmount;

  const buyerMarketplaceFeeAmount =
    order.buyer_marketplace_fee_amount != null &&
    order.buyer_marketplace_fee_amount > 0
      ? order.buyer_marketplace_fee_amount
      : Math.max(0, buyerTotalAmount - menuPriceAmount);

  const buyerMarketplaceFeeRateBps =
    order.buyer_marketplace_fee_rate_bps != null &&
    order.buyer_marketplace_fee_rate_bps > 0
      ? order.buyer_marketplace_fee_rate_bps
      : menuPriceAmount > 0
        ? Math.round((buyerMarketplaceFeeAmount / menuPriceAmount) * 10000)
        : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/b/jobs"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← {copy.backJobs}
          </Link>

          <Link
            href="/b/requests"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {copy.backPending}
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
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

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${paymentStatusClass(
                order.payment_status
              )}`}
            >
              {order.payment_status}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
        {copy.ruleNotice}
      </section>

      {isWaiting ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
          {copy.waitingNotice}
        </section>
      ) : null}

      {isAccepted ? (
        <section className="rounded-3xl border border-green-200 bg-green-50 p-5 text-sm leading-7 text-green-800">
          {copy.acceptedNotice}
        </section>
      ) : null}

      {isRevisionRequested ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          {copy.revisionRequestedNotice}
        </section>
      ) : null}

      {isDeclined ? (
        <section className="rounded-3xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
          {order.status === "declined_canceled"
            ? copy.declinedNotice
            : copy.canceledNotice}
        </section>
      ) : null}

      {isDelivered ? (
        <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-7 text-indigo-800">
          {copy.deliveredNotice}
        </section>
      ) : null}

      {isCompleted ? (
        <section className="rounded-3xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
          {copy.completedNotice}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700">
          {error}
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

          {order.revision_note ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-amber-900">
                {copy.currentRevisionNote}
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-amber-900">
                {order.revision_note}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.creatorInfo}</h2>

            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
              <CreatorAvatar creator={creator} />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.creatorName}
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  @{creator?.display_name ?? "unknown"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {copy.creatorCategory}: {creator?.category ?? copy.notSet}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={`/b/creators/${order.creator_id}`}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                {copy.creatorProfile}
              </Link>
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
                label={copy.expiredAt}
                value={formatDateTime(order.expired_at, safeLocale)}
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
                value={`${revisionCount} / ${maxRevisionCount}`}
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

              <Field
                label={copy.disputedAt}
                value={formatDateTime(order.disputed_at, safeLocale)}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.money}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {copy.amountNote}
            </p>

            <div className="mt-5 space-y-3">
              <Field
                label={copy.buyerPlan}
                value={formatPlanName(
                  order.buyer_plan_public_name_snapshot ??
                    order.buyer_plan_code_snapshot,
                  safeLocale
                )}
              />

              <Field
                label={copy.menuPrice}
                value={formatPrice(
                  order.menu_price_amount,
                  order.currency,
                  safeLocale
                )}
              />

              <Field
                label={copy.buyerFeeRate}
                value={formatBpsPercent(buyerMarketplaceFeeRateBps)}
              />

              <Field
                label={copy.buyerMarketplaceFee}
                value={formatPrice(
                  buyerMarketplaceFeeAmount,
                  order.currency,
                  safeLocale
                )}
              />

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {copy.buyerTotal}
                </p>
                <p className="mt-2 text-xl font-bold text-blue-950">
                  {formatPrice(buyerTotalAmount, order.currency, safeLocale)}
                </p>
              </div>

              <Field
                label={copy.stripeAmount}
                value={formatPrice(
                  order.stripe_amount,
                  order.currency,
                  safeLocale
                )}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.deliveredPostUrl}</h2>

            {order.delivered_post_url ? (
              <a
                href={order.delivered_post_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {copy.openDeliveredUrl}
              </a>
            ) : (
              <p className="mt-4 text-sm text-gray-500">-</p>
            )}
          </div>

          {canComplete ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">{copy.completeTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {copy.completeBody}
              </p>

              <button
                type="button"
                disabled={actionLoading === "complete"}
                onClick={runComplete}
                className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "complete"
                  ? copy.completing
                  : copy.complete}
              </button>
            </div>
          ) : null}

          {canRequestRevision ? (
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">{copy.revisionTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {copy.revisionBody}
              </p>

              <label className="mt-5 block text-sm font-semibold">
                {copy.revisionNoteLabel}
              </label>

              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder={copy.revisionPlaceholder}
                rows={6}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-amber-500"
              />

              <button
                type="button"
                disabled={
                  actionLoading === "revision" || revisionNote.trim().length < 10
                }
                onClick={runRequestRevision}
                className="mt-4 w-full rounded-2xl bg-amber-500 px-5 py-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "revision"
                  ? copy.requestingRevision
                  : copy.requestRevision}
              </button>
            </div>
          ) : null}

          {isDelivered && !canRequestRevision && !isCompleted ? (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
              {copy.revisionLimitReached}
            </div>
          ) : null}
        </aside>
      </section>

      <ChatEmbed orderId={order.id} title={copy.chatTitle} />
    </div>
  );
}