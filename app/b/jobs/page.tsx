// File: app/b/jobs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAppLocale } from "@/lib/i18n/locale";
import DeadlineBadge from "@/app/components/DeadlineBadge";

type ChatReadRow = {
  user_id: string;
  last_read_at: string | null;
};

type ChatRow = {
  id: string;
  request_id?: string | null;
  order_id?: string | null;
  last_message_at: string | null;
  chat_reads?: ChatReadRow[] | null;
};

type LegacyRequestRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  creators: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  chats: ChatRow[] | ChatRow | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  creator_id: string;
  creator_user_id: string;
  menu_title_snapshot: string | null;
  menu_price_amount: number | null;
  buyer_total_amount: number | null;
  currency: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  auto_complete_at: string | null;
};

type CreatorLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type JobItem = {
  kind: "order" | "legacy_request";
  id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  product_name: string | null;
  delivered_post_url: string | null;
  influencer_name: string | null;
  influencer_avatar_url: string | null;
  menu_title?: string | null;
  menu_price_amount?: number | null;
  buyer_total_amount?: number | null;
  currency?: string | null;
  revision_count?: number | null;
  max_revision_count?: number | null;
  auto_complete_at?: string | null;
  chat: ChatRow | null;
};

const STATUS_ORDER: Record<string, number> = {
  delivered: 0,
  revision_requested: 1,
  accepted_captured: 2,
  in_progress: 2,
  accepted: 2,
  completed: 3,
};

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-13 w-13 rounded-2xl object-cover md:h-14 md:w-14"
      />
    );
  }

  const initial = (name?.trim()?.[0] ?? "I").toUpperCase();

  return (
    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-emerald-100 text-lg font-black text-slate-900 md:h-14 md:w-14">
      {initial}
    </div>
  );
}

function normalizeChat(chats: LegacyRequestRow["chats"]): ChatRow | null {
  if (!chats) return null;
  if (Array.isArray(chats)) return chats[0] ?? null;
  return chats;
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
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
  if (value == null) return "";

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

function getStatusMeta(status: string, locale: "ja" | "en") {
  const ja: Record<string, { label: string; className: string }> = {
    accepted: {
      label: "進行中",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    accepted_captured: {
      label: "進行中",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    in_progress: {
      label: "進行中",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    delivered: {
      label: "確認する",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
    },
    revision_requested: {
      label: "修正依頼中",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
    },
    completed: {
      label: "完了",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
  };

  const en: Record<string, { label: string; className: string }> = {
    accepted: {
      label: "In progress",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    accepted_captured: {
      label: "In progress",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    in_progress: {
      label: "In progress",
      className: "bg-slate-950 text-white ring-slate-950",
    },
    delivered: {
      label: "Review",
      className: "bg-rose-50 text-[#ff5f67] ring-rose-100",
    },
    revision_requested: {
      label: "Revision",
      className: "bg-amber-50 text-amber-800 ring-amber-100",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
  };

  return (
    (locale === "ja" ? ja[status] : en[status]) ?? {
      label: status,
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;

  return time;
}

function getAutoCompleteSortValue(item: JobItem) {
  if (item.kind !== "order") return 9999999999999;
  if (item.status !== "delivered") return 9999999999999;

  return getTimestamp(item.auto_complete_at) ?? 9999999999999;
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function SummaryPill({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-black ${
        active
          ? "bg-slate-950 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {label} <span className="ml-1">{value}</span>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className="text-right text-sm font-black text-slate-950">
        {value}
      </span>
    </div>
  );
}

export default function JobsListPage() {
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "注文",
            subtitle:
              "進行中の注文、納品確認、完了した注文を確認できます。",
            viewRequests: "返答待ちを見る",
            empty: "進行中の注文はありません",
            emptyBody:
              "インフルエンサーが注文を承認すると、ここに表示されます。",
            unnamedInfluencer: "unknown",
            unnamedProduct: "未入力",
            menu: "メニュー",
            amount: "金額",
            updatedAt: "更新",
            detail: "詳細を見る",
            deliveredUrl: "納品URLあり",
            revisionCount: "修正",
            unreadMessages: "新着メッセージ",
            autoComplete: "自動完了",
            autoCompleteExpired: "自動完了期限超過",
            total: "すべて",
            active: "進行中",
            delivered: "確認する",
            completed: "完了",
            searchInfluencers: "インフルエンサーを探す",
            fetchError: "注文の取得に失敗しました。",
          }
        : {
            loading: "Loading...",
            title: "Orders",
            subtitle:
              "Review active orders, delivered orders, and completed orders.",
            viewRequests: "Waiting for replies",
            empty: "No active orders",
            emptyBody:
              "Orders accepted by influencers will appear here.",
            unnamedInfluencer: "unknown",
            unnamedProduct: "Not entered",
            menu: "Menu",
            amount: "Amount",
            updatedAt: "Updated",
            detail: "View details",
            deliveredUrl: "Delivered URL",
            revisionCount: "Revision",
            unreadMessages: "New message",
            autoComplete: "Auto complete",
            autoCompleteExpired: "Auto-complete overdue",
            total: "Total",
            active: "In progress",
            delivered: "Review",
            completed: "Completed",
            searchInfluencers: "Find influencers",
            fetchError: "Failed to load orders.",
          },
    [safeLocale]
  );

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("user load error:", userError);
      setJobs([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [
      { data: legacyRows, error: legacyError },
      { data: orderRows, error: orderError },
    ] = await Promise.all([
      supabase
        .from("requests")
        .select(
          `
          id,
          status,
          created_at,
          updated_at,
          product_name,
          delivered_post_url,
          creators:creators!requests_creator_user_id_fkey (
            display_name,
            avatar_url
          ),
          chats (
            id,
            request_id,
            last_message_at,
            chat_reads (
              user_id,
              last_read_at
            )
          )
        `
        )
        .eq("b_user_id", user.id)
        .in("status", ["accepted", "delivered", "completed"]),

      supabase
        .from("orders")
        .select(
          `
          id,
          status,
          payment_status,
          created_at,
          updated_at,
          product_name,
          delivered_post_url,
          creator_id,
          creator_user_id,
          menu_title_snapshot,
          menu_price_amount,
          buyer_total_amount,
          currency,
          revision_requested_at,
          revision_count,
          max_revision_count,
          auto_complete_at
        `
        )
        .eq("b_user_id", user.id)
        .in("status", [
          "accepted_captured",
          "in_progress",
          "delivered",
          "revision_requested",
          "completed",
        ]),
    ]);

    if (legacyError || orderError) {
      console.error("orders load error:", { legacyError, orderError });
      setError(copy.fetchError);
      setJobs([]);
      setLoading(false);
      return;
    }

    const orders = (orderRows ?? []) as OrderRow[];
    const orderIds = orders.map((order) => order.id);
    const influencerIds = Array.from(
      new Set(orders.map((order) => order.creator_id).filter(Boolean))
    );

    let influencerMap = new Map<string, CreatorLite>();
    let orderChatMap = new Map<string, ChatRow>();

    if (influencerIds.length > 0) {
      const { data: influencerRows, error: influencerError } = await supabase
        .from("creators")
        .select("id, display_name, avatar_url")
        .in("id", influencerIds);

      if (influencerError) {
        console.error("order influencer load error:", influencerError);
      } else {
        influencerMap = new Map(
          ((influencerRows ?? []) as CreatorLite[]).map((influencer) => [
            influencer.id,
            influencer,
          ])
        );
      }
    }

    if (orderIds.length > 0) {
      const { data: chatRows, error: chatError } = await supabase
        .from("chats")
        .select(
          `
          id,
          order_id,
          last_message_at,
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in("order_id", orderIds);

      if (chatError) {
        console.error("order chat load error:", chatError);
      } else {
        orderChatMap = new Map(
          ((chatRows ?? []) as ChatRow[])
            .filter((chat) => !!chat.order_id)
            .map((chat) => [chat.order_id as string, chat])
        );
      }
    }

    const legacyItems: JobItem[] = ((legacyRows ?? []) as LegacyRequestRow[]).map(
      (row) => ({
        kind: "legacy_request",
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        product_name: row.product_name,
        delivered_post_url: row.delivered_post_url,
        influencer_name: row.creators?.display_name ?? null,
        influencer_avatar_url: row.creators?.avatar_url ?? null,
        chat: normalizeChat(row.chats),
      })
    );

    const orderItems: JobItem[] = orders.map((order) => {
      const influencer = influencerMap.get(order.creator_id) ?? null;

      return {
        kind: "order",
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product_name: order.product_name,
        delivered_post_url: order.delivered_post_url,
        influencer_name: influencer?.display_name ?? null,
        influencer_avatar_url: influencer?.avatar_url ?? null,
        menu_title: order.menu_title_snapshot,
        menu_price_amount: order.menu_price_amount,
        buyer_total_amount: order.buyer_total_amount,
        currency: order.currency,
        revision_count: order.revision_count,
        max_revision_count: order.max_revision_count,
        auto_complete_at: order.auto_complete_at,
        chat: orderChatMap.get(order.id) ?? null,
      };
    });

    setJobs([...orderItems, ...legacyItems]);
    setLoading(false);
  }, [copy.fetchError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("b-jobs-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reads",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        () => {
          void load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void load();
        }
      )
      .subscribe();

    const onFocus = () => {
      void load();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("trendre:chat-read-changed", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("trendre:chat-read-changed", onFocus);
    };
  }, [load]);

  const hasUnread = useCallback(
    (item: JobItem) => {
      if (!currentUserId) return false;
      if (!item.chat?.last_message_at) return false;

      const readRow =
        item.chat.chat_reads?.find((row) => row.user_id === currentUserId) ??
        null;

      if (!readRow?.last_read_at) return true;

      return (
        new Date(item.chat.last_message_at).getTime() >
        new Date(readRow.last_read_at).getTime()
      );
    },
    [currentUserId]
  );

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aAuto = getAutoCompleteSortValue(a);
      const bAuto = getAutoCompleteSortValue(b);

      if (aAuto !== bAuto) return aAuto - bAuto;

      const statusDiff =
        (STATUS_ORDER[a.status] ?? 999) - (STATUS_ORDER[b.status] ?? 999);

      if (statusDiff !== 0) return statusDiff;

      const aUnread = hasUnread(a) ? 1 : 0;
      const bUnread = hasUnread(b) ? 1 : 0;

      if (aUnread !== bUnread) return bUnread - aUnread;

      const aLast = a.chat?.last_message_at
        ? new Date(a.chat.last_message_at).getTime()
        : 0;
      const bLast = b.chat?.last_message_at
        ? new Date(b.chat.last_message_at).getTime()
        : 0;

      if (aLast !== bLast) return bLast - aLast;

      const aTime = new Date(a.updated_at ?? a.created_at).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at).getTime();

      return bTime - aTime;
    });
  }, [jobs, hasUnread]);

  const activeCount = sortedJobs.filter((job) =>
    ["accepted", "accepted_captured", "in_progress", "revision_requested"].includes(
      job.status
    )
  ).length;
  const deliveredCount = sortedJobs.filter((job) => job.status === "delivered").length;
  const completedCount = sortedJobs.filter((job) => job.status === "completed").length;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-32 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="h-36 animate-pulse rounded-[28px] bg-white shadow-sm" />
          <div className="h-36 animate-pulse rounded-[28px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/b/requests"
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
              >
                {copy.viewRequests}
              </Link>
              <Link
                href="/b/creators"
                className="inline-flex items-center justify-center rounded-full bg-[#ff5f67] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff4b55]"
              >
                {copy.searchInfluencers}
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <SummaryPill label={copy.total} value={sortedJobs.length} active />
            <SummaryPill label={copy.active} value={activeCount} />
            <SummaryPill label={copy.delivered} value={deliveredCount} />
            <SummaryPill label={copy.completed} value={completedCount} />
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

        {sortedJobs.length === 0 ? (
          <div className="mt-5 rounded-[28px] bg-white p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:p-12">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              {copy.empty}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">
              {copy.emptyBody}
            </p>
            <Link
              href="/b/creators"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              {copy.searchInfluencers}
            </Link>
          </div>
        ) : (
          <section className="mt-5 space-y-3">
            {sortedJobs.map((job) => {
              const meta = getStatusMeta(job.status, safeLocale);
              const detailHref =
                job.kind === "order"
                  ? `/b/orders/${job.id}`
                  : `/b/requests/${job.id}`;

              const unread = hasUnread(job);
              const isDelivered = job.status === "delivered";
              const isRevision = job.status === "revision_requested";

              return (
                <Link
                  key={`${job.kind}-${job.id}`}
                  href={detailHref}
                  className="block rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-[0_24px_70px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Pill className={meta.className}>{meta.label}</Pill>

                        {unread ? (
                          <Pill className="bg-blue-50 text-blue-700 ring-blue-100">
                            {copy.unreadMessages}
                          </Pill>
                        ) : null}

                        {job.delivered_post_url ? (
                          <Pill className="bg-rose-50 text-[#ff5f67] ring-rose-100">
                            {copy.deliveredUrl}
                          </Pill>
                        ) : null}

                        {isRevision && job.revision_count != null ? (
                          <Pill className="bg-amber-50 text-amber-800 ring-amber-100">
                            {copy.revisionCount} {job.revision_count}/
                            {job.max_revision_count ?? 1}
                          </Pill>
                        ) : null}

                        {isDelivered && job.auto_complete_at ? (
                          <DeadlineBadge
                            deadline={job.auto_complete_at}
                            label={copy.autoComplete}
                            expiredLabel={copy.autoCompleteExpired}
                            locale={safeLocale}
                            urgentHours={12}
                            warningHours={24}
                          />
                        ) : null}
                      </div>

                      <div className="flex items-start gap-4">
                        <Avatar
                          name={job.influencer_name ?? copy.unnamedInfluencer}
                          avatarUrl={job.influencer_avatar_url}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-500">
                            {job.influencer_name ?? copy.unnamedInfluencer}
                          </p>
                          <h2 className="mt-1 truncate text-[22px] font-black tracking-[-0.04em] text-slate-950">
                            {job.product_name ?? copy.unnamedProduct}
                          </h2>
                          {job.menu_title ? (
                            <p className="mt-2 truncate text-sm font-semibold text-slate-500">
                              {copy.menu}: {job.menu_title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 rounded-[22px] bg-slate-50 px-4 py-4 lg:w-[260px]">
                      <InfoLine
                        label={copy.amount}
                        value={formatPrice(
                          job.buyer_total_amount ?? job.menu_price_amount,
                          job.currency,
                          safeLocale
                        )}
                      />
                      <InfoLine
                        label={copy.updatedAt}
                        value={formatDateTime(job.updated_at ?? job.created_at, safeLocale)}
                      />
                    </div>

                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 lg:flex">
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}