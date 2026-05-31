// File: app/creator/orders/[id]/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";

type OrderDetail = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;

  product_name: string | null;
  product_url: string | null;
  requirements: string | null;
  deadline: string | null;
  has_free_offer: boolean | null;
  wants_secondary_use: boolean | null;

  menu_title_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;

  currency: string | null;
  menu_price_amount: number | null;
  creator_payout_amount: number | null;
  creator_accept_deadline: string | null;

  delivered_post_url: string | null;
  revision_note: string | null;
  transfer_status: string | null;
};

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
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
    return safeCurrency === "USD"
      ? `$${value.toLocaleString()}`
      : `¥${value.toLocaleString()}`;
  }
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

function statusLabel(status: string, locale: "ja" | "en") {
  if (locale === "ja") {
    if (status === "authorized_pending_creator") return "返答待ち";
    if (status === "accepted_captured" || status === "in_progress") return "進行中";
    if (status === "revision_requested") return "修正対応";
    if (status === "delivered") return "確認待ち";
    if (status === "completed") return "完了";
    if (status === "declined_canceled") return "辞退済み";
    if (status === "expired_canceled") return "期限切れ";
    return "注文";
  }

  if (status === "authorized_pending_creator") return "Pending";
  if (status === "accepted_captured" || status === "in_progress") return "In progress";
  if (status === "revision_requested") return "Revision";
  if (status === "delivered") return "Review";
  if (status === "completed") return "Done";
  if (status === "declined_canceled") return "Declined";
  if (status === "expired_canceled") return "Expired";
  return "Order";
}

function statusTone(status: string): "rose" | "blue" | "amber" | "green" | "slate" {
  if (status === "authorized_pending_creator") return "amber";
  if (status === "revision_requested") return "rose";
  if (status === "accepted_captured" || status === "in_progress") return "blue";
  if (status === "completed") return "green";
  return "slate";
}

function transferLabel(value: string | null, locale: "ja" | "en") {
  const status = value || "not_started";

  if (locale === "ja") {
    if (status === "transferred") return "送金済み";
    if (status === "pending") return "送金処理中";
    if (status === "failed") return "送金確認中";
    return "完了後に反映";
  }

  if (status === "transferred") return "Transferred";
  if (status === "pending") return "Processing";
  if (status === "failed") return "Checking";
  return "After completion";
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

function SoftPill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "rose" | "blue" | "amber" | "green" | "slate";
}) {
  const className =
    tone === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <h2 className="text-[20px] font-black leading-tight tracking-[-0.04em] text-slate-950">
        {title}
      </h2>
      {body ? (
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {body}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="shrink-0 text-xs font-black text-slate-400">{label}</span>
      <span
        className={`min-w-0 max-w-[66%] break-words text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TextBlock({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4">
      <p className="whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "danger"
          ? "w-full rounded-full bg-rose-50 px-5 py-4 text-sm font-black text-[#ff5f67] ring-1 ring-rose-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          : "w-full rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {children}
    </button>
  );
}

function getNextActionCopy(status: string, locale: "ja" | "en") {
  if (locale === "ja") {
    if (status === "authorized_pending_creator") {
      return {
        title: "注文内容を確認してください",
        body: "受ける場合は承認、対応が難しい場合は辞退できます。",
      };
    }

    if (status === "revision_requested") {
      return {
        title: "修正対応が必要です",
        body: "企業からの修正内容を確認して、再度納品URLを提出してください。",
      };
    }

    if (status === "delivered") {
      return {
        title: "企業の確認待ちです",
        body: "納品URLは提出済みです。企業の確認を待ちましょう。",
      };
    }

    if (status === "completed") {
      return {
        title: "この注文は完了しました",
        body: "報酬の送金状況は報酬ページから確認できます。",
      };
    }

    if (status === "accepted_captured" || status === "in_progress") {
      return {
        title: "納品を進めましょう",
        body: "制作・投稿が完了したら、納品URLを提出してください。",
      };
    }

    return {
      title: "この注文は終了しています",
      body: "辞退または期限切れの注文です。",
    };
  }

  if (status === "authorized_pending_creator") {
    return {
      title: "Review this order",
      body: "Accept it if you can handle it, or decline if it is not suitable.",
    };
  }

  if (status === "revision_requested") {
    return {
      title: "Revision needed",
      body: "Check the revision request and submit the updated delivery URL.",
    };
  }

  if (status === "delivered") {
    return {
      title: "Waiting for review",
      body: "Your delivery URL has been submitted. Wait for the company review.",
    };
  }

  if (status === "completed") {
    return {
      title: "This order is complete",
      body: "You can check payout status from the payouts page.",
    };
  }

  if (status === "accepted_captured" || status === "in_progress") {
    return {
      title: "Continue delivery",
      body: "Submit the delivery URL when the work is ready.",
    };
  }

  return {
    title: "This order is closed",
    body: "This order was declined or expired.",
  };
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
            back: "一覧へ戻る",
            chatTitle: "注文チャット",
            nextAction: "次にやること",
            orderContent: "Bからの注文内容",
            orderContentBody: "商品・希望日・依頼内容を確認できます。",
            deliveryTitle: "納品URLを提出",
            redeliveryTitle: "修正版の納品URLを提出",
            deliveryBody:
              "投稿URL、成果物URL、Google Drive URLなど、企業が確認できるURLを入力してください。",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "提出済みURLを開く",
            deliver: "納品URLを提出する",
            redeliver: "修正版を提出する",
            updateDelivery: "納品URLを更新する",
            delivering: "送信中...",
            deliveryRequired: "納品URLを入力してください。",
            deliveryFailed: "納品処理に失敗しました。",
            accept: "注文を受ける",
            decline: "辞退する",
            accepting: "承認中...",
            declining: "辞退中...",
            confirmAccept:
              "この注文を受けますか？受けると決済が確定し、注文が開始されます。",
            confirmDecline:
              "この注文を辞退しますか？辞退すると請求は確定しません。",
            confirmDeliver: "このURLで納品しますか？",
            confirmRedeliver: "このURLで修正版を提出しますか？",
            acceptFailed: "承認処理に失敗しました。",
            declineFailed: "辞退処理に失敗しました。",
            authFailed: "ログイン情報を取得できませんでした。",
            productName: "商品・案件",
            productUrl: "商品URL",
            deadline: "希望日",
            freeOffer: "商品提供",
            secondaryUse: "二次利用",
            yes: "あり",
            no: "なし",
            requirements: "依頼内容",
            menuAndPayout: "メニュー・報酬",
            menuTitle: "メニュー",
            platform: "SNS",
            menuType: "形式",
            category: "カテゴリー",
            deliveryDays: "目安",
            deliverables: "納品物",
            price: "メニュー価格",
            payout: "受取予定",
            transfer: "送金",
            revisionTitle: "修正依頼",
            notSet: "未設定",
          }
        : {
            loading: "Loading...",
            notFound: "Order was not found.",
            back: "Back",
            chatTitle: "Order chat",
            nextAction: "Next action",
            orderContent: "Order details",
            orderContentBody: "Check the product, date, and request details.",
            deliveryTitle: "Submit delivery URL",
            redeliveryTitle: "Submit revised URL",
            deliveryBody:
              "Enter a URL the company can review, such as a post URL, deliverable URL, or Google Drive URL.",
            deliveredPostUrlPlaceholder: "https://...",
            openDeliveredUrl: "Open submitted URL",
            deliver: "Submit delivery URL",
            redeliver: "Submit revised URL",
            updateDelivery: "Update delivery URL",
            delivering: "Submitting...",
            deliveryRequired: "Please enter a delivery URL.",
            deliveryFailed: "Failed to submit delivery.",
            accept: "Accept order",
            decline: "Decline",
            accepting: "Accepting...",
            declining: "Declining...",
            confirmAccept:
              "Accept this order? Payment will be captured and the order will start.",
            confirmDecline:
              "Decline this order? The charge will not be finalized.",
            confirmDeliver: "Submit this URL?",
            confirmRedeliver: "Submit this revised URL?",
            acceptFailed: "Failed to accept this order.",
            declineFailed: "Failed to decline this order.",
            authFailed: "Could not retrieve your login session.",
            productName: "Product",
            productUrl: "Product URL",
            deadline: "Preferred date",
            freeOffer: "Free product",
            secondaryUse: "Secondary use",
            yes: "Yes",
            no: "No",
            requirements: "Request",
            menuAndPayout: "Menu & payout",
            menuTitle: "Menu",
            platform: "Platform",
            menuType: "Type",
            category: "Category",
            deliveryDays: "Delivery",
            deliverables: "Deliverable",
            price: "Menu price",
            payout: "Expected payout",
            transfer: "Transfer",
            revisionTitle: "Revision request",
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
        created_at,
        updated_at,
        product_name,
        product_url,
        requirements,
        deadline,
        has_free_offer,
        wants_secondary_use,
        menu_title_snapshot,
        menu_platform_snapshot,
        menu_type_snapshot,
        menu_category_snapshot,
        menu_deliverables_snapshot,
        menu_delivery_days_snapshot,
        currency,
        menu_price_amount,
        creator_payout_amount,
        creator_accept_deadline,
        delivered_post_url,
        revision_note,
        transfer_status
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
      <div className="space-y-4 overflow-x-hidden pb-4">
        <div className="h-28 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="h-[520px] animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="h-48 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="overflow-x-hidden pb-4">
        <Card title={copy.notFound}>
          <Link
            href="/creator/requests"
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            {copy.back}
          </Link>
        </Card>
      </div>
    );
  }

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
  const nextAction = getNextActionCopy(order.status, safeLocale);

  const backHref =
    order.status === "authorized_pending_creator"
      ? "/creator/requests"
      : "/creator/jobs";

  return (
    <div className="max-w-full touch-pan-y space-y-4 overflow-x-hidden overscroll-y-contain pb-4">
      <section className="relative overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rose-100/45 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <SoftPill tone={statusTone(order.status)}>
              {statusLabel(order.status, safeLocale)}
            </SoftPill>

            {order.creator_accept_deadline &&
            order.status === "authorized_pending_creator" ? (
              <SoftPill tone="amber">
                {formatDateTime(order.creator_accept_deadline, safeLocale)}
              </SoftPill>
            ) : null}
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-[24px] font-black leading-tight tracking-[-0.055em] text-slate-950">
                {order.product_name || nextAction.title}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                {nextAction.body}
              </p>
            </div>
          </div>

          <Link
            href={backHref}
            className="mt-5 inline-flex rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            {copy.back}
          </Link>
        </div>
      </section>

      {error ? (
        <section className="rounded-[26px] bg-rose-50 p-5 text-rose-900 ring-1 ring-rose-100">
          <p className="text-sm font-semibold leading-7">{error}</p>
        </section>
      ) : null}

      {canAct ? (
        <Card title={copy.nextAction} body={nextAction.body}>
          <div className="grid gap-3">
            <ActionButton
              onClick={() => void runAction("accept")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "accept" ? copy.accepting : copy.accept}
            </ActionButton>

            <ActionButton
              onClick={() => void runAction("decline")}
              disabled={actionLoading !== null}
              variant="danger"
            >
              {actionLoading === "decline" ? copy.declining : copy.decline}
            </ActionButton>
          </div>
        </Card>
      ) : null}

      <div className="max-w-full overflow-hidden rounded-[30px] shadow-[0_18px_55px_rgba(15,23,42,0.045)]">
        <ChatEmbed orderId={order.id} title={copy.chatTitle} />
      </div>

      {canDeliver ? (
        <Card
          title={isRevisionRequested ? copy.redeliveryTitle : copy.deliveryTitle}
          body={copy.deliveryBody}
        >
          <input
            type="url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder={copy.deliveredPostUrlPlaceholder}
            className="w-full rounded-[22px] border border-slate-200 px-4 py-4 text-base outline-none transition focus:border-[#ff5f67] focus:ring-4 focus:ring-rose-50"
          />

          {order.delivered_post_url ? (
            <a
              href={order.delivered_post_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex max-w-full rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 underline-offset-4 ring-1 ring-slate-100 hover:underline"
            >
              <span className="truncate">{copy.openDeliveredUrl}</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => void runDeliver()}
            disabled={actionLoading !== null}
            className="mt-5 w-full rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,95,103,0.22)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "deliver"
              ? copy.delivering
              : isRevisionRequested
                ? copy.redeliver
                : order.delivered_post_url
                  ? copy.updateDelivery
                  : copy.deliver}
          </button>
        </Card>
      ) : null}

      {isRevisionRequested && order.revision_note ? (
        <Card title={copy.revisionTitle}>
          <TextBlock value={order.revision_note} emptyLabel={copy.notSet} />
        </Card>
      ) : null}

      <Card title={copy.orderContent} body={copy.orderContentBody}>
        <div className="rounded-[24px] bg-slate-50 p-4">
          <InfoRow
            label={copy.productName}
            value={order.product_name || copy.notSet}
            strong
          />

          <InfoRow
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

          <InfoRow
            label={copy.deadline}
            value={formatDate(order.deadline, safeLocale)}
          />

          <InfoRow
            label={copy.freeOffer}
            value={order.has_free_offer ? copy.yes : copy.no}
          />

          <InfoRow
            label={copy.secondaryUse}
            value={order.wants_secondary_use ? copy.yes : copy.no}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-black text-slate-400">
            {copy.requirements}
          </p>
          <TextBlock value={order.requirements} emptyLabel={copy.notSet} />
        </div>
      </Card>

      <Card title={copy.menuAndPayout}>
        <div className="mb-4 flex flex-wrap gap-2">
          {order.menu_platform_snapshot ? (
            <SoftPill tone="slate">
              <span className="mr-1">{getPlatformIcon(order.menu_platform_snapshot)}</span>
              {order.menu_platform_snapshot}
            </SoftPill>
          ) : null}

          <SoftPill tone="slate">
            {menuTypeLabel(
              order.menu_type_snapshot,
              safeLocale,
              order.menu_category_snapshot || copy.notSet
            )}
          </SoftPill>

          {order.menu_category_snapshot ? (
            <SoftPill tone="slate">{order.menu_category_snapshot}</SoftPill>
          ) : null}
        </div>

        <div className="rounded-[24px] bg-slate-50 p-4">
          <InfoRow
            label={copy.menuTitle}
            value={order.menu_title_snapshot || copy.notSet}
            strong
          />

          <InfoRow
            label={copy.deliveryDays}
            value={formatDeliveryDays(
              order.menu_delivery_days_snapshot,
              safeLocale,
              copy.notSet
            )}
          />

          <InfoRow
            label={copy.deliverables}
            value={order.menu_deliverables_snapshot || copy.notSet}
          />

          <InfoRow
            label={copy.price}
            value={formatPrice(order.menu_price_amount, order.currency, safeLocale)}
          />

          <InfoRow
            label={copy.payout}
            value={formatPrice(order.creator_payout_amount, order.currency, safeLocale)}
            strong
          />

          <InfoRow
            label={copy.transfer}
            value={transferLabel(order.transfer_status, safeLocale)}
          />
        </div>

        <Link
          href="/creator/payouts"
          className="mt-5 flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition active:scale-[0.98]"
        >
          {copy.payout}
        </Link>
      </Card>
    </div>
  );
}