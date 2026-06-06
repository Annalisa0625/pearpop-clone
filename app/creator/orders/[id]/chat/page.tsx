// File: app/creator/orders/[id]/chat/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";
import ChatEmbed from "@/app/components/ChatEmbed";

type OrderLite = {
  id: string;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
};

const AUTH_TIMEOUT_MS = 8000;
const ORDER_TIMEOUT_MS = 10000;

function withTimeout<T = any>(
  promiseLike: PromiseLike<T> | T,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isTerminalStatus(status: string) {
  return [
    "completed",
    "declined_canceled",
    "expired_canceled",
    "canceled",
    "cancelled",
  ].includes(status);
}

function isCheckoutPending(order: OrderLite) {
  return (
    order.status === "checkout_pending" ||
    order.payment_status === "checkout_pending"
  );
}

function isWaitingForCreator(order: OrderLite) {
  if (isCheckoutPending(order)) return false;
  if (order.status === "authorized_pending_creator") return true;

  return (
    order.payment_status === "authorized" &&
    !isTerminalStatus(order.status) &&
    order.status !== "delivered" &&
    order.status !== "revision_requested" &&
    order.status !== "completed"
  );
}

function canOpenChat(order: OrderLite) {
  if (isCheckoutPending(order)) return false;
  if (isWaitingForCreator(order)) return false;
  if (isTerminalStatus(order.status)) return false;

  return (
    order.payment_status === "captured" ||
    order.status === "accepted_captured" ||
    order.status === "in_progress" ||
    order.status === "delivered" ||
    order.status === "revision_requested"
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CreatorOrderChatPage() {
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
            back: "注文詳細",
            notFound: "注文が見つかりませんでした。",
            authFailed: "ログイン情報を取得できませんでした。",
            chatUnavailableTitle: "チャットは注文を受けた後に使えます",
            chatUnavailableBody:
              "注文を受ける前は、注文内容を確認して「受ける」または「辞退する」を選択してください。",
            titleFallback: "注文チャット",
            menu: "メニュー",
          }
        : {
            loading: "Loading...",
            back: "Order",
            notFound: "Order was not found.",
            authFailed: "Could not retrieve your login session.",
            chatUnavailableTitle: "Chat is available after accepting",
            chatUnavailableBody:
              "Before accepting, review the order details and choose accept or decline.",
            titleFallback: "Order chat",
            menu: "Menu",
          },
    [safeLocale]
  );

  const [order, setOrder] = useState<OrderLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authResult: any = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        copy.authFailed
      );

      const user = authResult?.data?.session?.user ?? null;

      if (authResult?.error || !user) {
        setError(copy.authFailed);
        setOrder(null);
        setLoading(false);
        return;
      }

      const orderResult: any = await withTimeout(
        supabase
          .from("orders")
          .select(
            `
            id,
            status,
            payment_status,
            product_name,
            menu_title_snapshot
          `
          )
          .eq("id", orderId)
          .eq("creator_user_id", user.id)
          .maybeSingle(),
        ORDER_TIMEOUT_MS,
        copy.notFound
      );

      if (orderResult?.error) {
        console.error("creator order chat load error:", orderResult.error);
        setError(copy.notFound);
        setOrder(null);
        setLoading(false);
        return;
      }

      setOrder((orderResult?.data as OrderLite | null) ?? null);
      setLoading(false);
    } catch (error) {
      console.error("creator order chat load error:", error);
      setError(error instanceof Error ? error.message : copy.notFound);
      setOrder(null);
      setLoading(false);
    }
  }, [copy.authFailed, copy.notFound, orderId, supabase]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-96px)] bg-[#F8F9FA] px-3 py-3 sm:px-4">
        <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-slate-100">
          <div className="h-16 animate-pulse border-b border-slate-100 bg-white" />
          <div className="flex-1 animate-pulse bg-slate-50" />
        </div>
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="min-h-[calc(100vh-96px)] bg-[#F8F9FA] px-4 py-5">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          <p className="text-sm font-semibold leading-7 text-slate-600">
            {error || copy.notFound}
          </p>

          <Link
            href={`/creator/orders/${orderId}`}
            className="mt-4 inline-flex rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white"
          >
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  if (!canOpenChat(order)) {
    return (
      <div className="min-h-[calc(100vh-96px)] bg-[#F8F9FA] px-4 py-5">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          <Link
            href={`/creator/orders/${order.id}`}
            className="inline-flex rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
          >
            {copy.back}
          </Link>

          <h1 className="mt-5 text-[26px] font-black leading-tight tracking-[-0.055em] text-slate-950">
            {copy.chatUnavailableTitle}
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
            {copy.chatUnavailableBody}
          </p>
        </div>
      </div>
    );
  }

  const title = order.product_name || copy.titleFallback;

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#F8F9FA] px-3 py-3 sm:px-4">
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/creator/orders/${order.id}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-100 active:scale-[0.96]"
              aria-label={copy.back}
            >
              <BackIcon />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-black tracking-[-0.035em] text-slate-950">
                {title}
              </h1>

              {order.menu_title_snapshot ? (
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                  {copy.menu}：{order.menu_title_snapshot}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <ChatEmbed
            orderId={order.id}
            title={copy.titleFallback}
            variant="page"
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
}