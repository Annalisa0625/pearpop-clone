// File: app/creator/jobs/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  creator_accept_deadline: string | null;
};

type TodoOrder = {
  id: string;
  title: string;
  status: string;
  updated_at: string | null;
  created_at: string;
};

function getTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function isIncomingOrder(order: OrderRow) {
  if (
    order.status !== "authorized_pending_creator" ||
    order.payment_status !== "authorized"
  ) {
    return false;
  }

  const deadlineTime = getTime(order.creator_accept_deadline);

  if (deadlineTime == null) {
    return true;
  }

  return deadlineTime > Date.now();
}

function isExecutionOrder(order: OrderRow) {
  return [
    "accepted_captured",
    "in_progress",
    "revision_requested",
  ].includes(order.status);
}

function getOrderTitle(order: Pick<OrderRow, "product_name" | "menu_title_snapshot">) {
  const productName = order.product_name?.trim();
  const menuName = order.menu_title_snapshot?.trim();

  return productName || menuName || "注文";
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m8.4 12.2 2.4 2.4 5-5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 10 17 19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28">
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      </div>
    </main>
  );
}

function TodoItem({
  href,
  title,
  body,
  accent = "slate",
}: {
  href: string;
  title: string;
  body?: string;
  accent?: "rose" | "slate";
}) {
  const iconClass =
    accent === "rose"
      ? "bg-rose-50 text-[#FF3B5C] ring-rose-100"
      : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <Link href={href} className="block">
      <article className="flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition active:scale-[0.98]">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ring-1 ${iconClass}`}
        >
          <CheckIcon />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-black tracking-[-0.035em] text-slate-950">
            {title}
          </h2>

          {body ? (
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-400">
              {body}
            </p>
          ) : null}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <ChevronIcon />
        </div>
      </article>
    </Link>
  );
}

export default function CreatorJobsPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "ToDo",
            subtitle: "今やることだけを確認できます。",
            incomingTitle: "注文が届いています",
            incomingBody: "受ける / 辞退する注文があります。",
            executionSuffix: "実行待ちです",
            executionBody:
              "PR投稿・制作・納品URLの提出を進めてください。",
            emptyTitle: "今やることはありません",
            emptyBody:
              "新しい注文や実行待ちの注文があると、ここに表示されます。",
            errorTitle: "ToDoを取得できませんでした",
            errorBody: "時間をおいてもう一度お試しください。",
          }
        : {
            title: "ToDo",
            subtitle: "Check only what needs action now.",
            incomingTitle: "New orders are waiting",
            incomingBody: "There are orders to accept or decline.",
            executionSuffix: "is waiting for action",
            executionBody:
              "Continue production, posting, or delivery URL submission.",
            emptyTitle: "Nothing to do now",
            emptyBody:
              "New orders and active orders will appear here.",
            errorTitle: "Failed to load ToDo",
            errorBody: "Please try again later.",
          },
    [safeLocale]
  );

  const [incomingCount, setIncomingCount] = useState(0);
  const [executionOrders, setExecutionOrders] = useState<TodoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIncomingCount(0);
        setExecutionOrders([]);
        setLoading(false);
        return;
      }

      const { data, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          updated_at,
          status,
          payment_status,
          product_name,
          menu_title_snapshot,
          creator_accept_deadline
        `
        )
        .eq("creator_user_id", user.id)
        .in("status", [
          "authorized_pending_creator",
          "accepted_captured",
          "in_progress",
          "revision_requested",
        ])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("creator todo load error:", orderError);
        setIncomingCount(0);
        setExecutionOrders([]);
        setError(true);
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as unknown as OrderRow[]).filter(Boolean);

      const incoming = rows.filter(isIncomingOrder);

      const execution = rows
        .filter(isExecutionOrder)
        .map((order) => ({
          id: order.id,
          title: getOrderTitle(order),
          status: order.status,
          updated_at: order.updated_at,
          created_at: order.created_at,
        }));

      setIncomingCount(incoming.length);
      setExecutionOrders(execution);
      setLoading(false);
    } catch (error) {
      console.error("creator todo load error:", error);
      setIncomingCount(0);
      setExecutionOrders([]);
      setError(true);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    const channel = supabase
      .channel("creator-todos-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void loadTodos();
        }
      )
      .subscribe();

    const onFocus = () => {
      void loadTodos();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadTodos, supabase]);

  if (loading) {
    return <LoadingView />;
  }

  const hasTodos = incomingCount > 0 || executionOrders.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28">
      <section className="mb-4 overflow-hidden rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF3B5C]">
          Trendre
        </p>

        <h1 className="mt-2 text-[30px] font-black tracking-[-0.06em] text-slate-950">
          {copy.title}
        </h1>

        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {copy.subtitle}
        </p>
      </section>

      {error ? (
        <section className="mb-4 rounded-[24px] bg-rose-50 p-4 text-sm font-semibold leading-7 text-rose-700 ring-1 ring-rose-100">
          <p className="font-black">{copy.errorTitle}</p>
          <p className="mt-1">{copy.errorBody}</p>
        </section>
      ) : null}

      {!hasTodos && !error ? (
        <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <EmptyIcon />
          </div>

          <h2 className="mt-5 text-lg font-black tracking-[-0.04em] text-slate-950">
            {copy.emptyTitle}
          </h2>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-400">
            {copy.emptyBody}
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        {incomingCount > 0 ? (
          <TodoItem
            href="/creator/requests"
            title={copy.incomingTitle}
            body={
              safeLocale === "ja"
                ? `${incomingCount}件の注文に返答が必要です。`
                : `${incomingCount} order${
                    incomingCount === 1 ? "" : "s"
                  } need a reply.`
            }
            accent="rose"
          />
        ) : null}

        {executionOrders.map((order) => (
          <TodoItem
            key={order.id}
            href={`/creator/orders/${order.id}`}
            title={`${order.title}：${copy.executionSuffix}`}
            body={copy.executionBody}
            accent="slate"
          />
        ))}
      </section>
    </main>
  );
}