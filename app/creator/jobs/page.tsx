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

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
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

function getActionLabel(status: string, locale: "ja" | "en") {
  if (status === "revision_requested") {
    return locale === "ja" ? "修正しましょう" : "Revise your work";
  }

  return locale === "ja" ? "投稿しましょう" : "Post and deliver";
}

function getActionBody(status: string, locale: "ja" | "en") {
  if (status === "revision_requested") {
    return locale === "ja"
      ? "修正内容を確認して、再提出を進めましょう。"
      : "Review the requested changes and submit again.";
  }

  return locale === "ja"
    ? "PR投稿・制作・納品URLの提出を進めましょう。"
    : "Continue posting, production, or delivery URL submission.";
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
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

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.6-2.7 1.6-2.6-1.6L8 20l-3-1.6V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <div className="space-y-2.5">
        <div className="h-8 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
        <div className="h-28 animate-pulse rounded-[24px] bg-white ring-1 ring-slate-100" />
      </div>
    </main>
  );
}

function ActionStyle() {
  return (
    <style jsx global>{`
      @keyframes trendreTodoBubbleFloat {
        0%,
        100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -3px, 0);
        }
      }

      .trendre-todo-bubble {
        animation: trendreTodoBubbleFloat 2.4s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .trendre-todo-bubble {
          animation: none;
        }
      }
    `}</style>
  );
}

function IconBubble({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "rose" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[17px] ring-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function SpeechBubble({
  children,
  tone = "rose",
}: {
  children: React.ReactNode;
  tone?: "rose" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-[#ff3860] ring-rose-100"
      : "bg-slate-50 text-slate-700 ring-slate-100";

  const pointerClass =
    tone === "rose"
      ? "border-r-rose-50"
      : "border-r-slate-50";

  return (
    <span
      className={`trendre-todo-bubble relative inline-flex items-center rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ${toneClass}`}
    >
      <span
        className={`absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-r-[8px] border-y-transparent ${pointerClass}`}
      />
      {children}
    </span>
  );
}

function ActionCard({
  href,
  icon,
  title,
  bubble,
  body,
  date,
  tone = "rose",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  bubble: string;
  body: string;
  date?: string;
  tone?: "rose" | "slate";
}) {
  return (
    <Link href={href} className="block">
      <article className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-100 transition active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <IconBubble tone={tone}>{icon}</IconBubble>

          <div className="min-w-0 flex-1">
            <SpeechBubble tone={tone}>{bubble}</SpeechBubble>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
                  {title}
                </h2>
                <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                  {body}
                </p>
                {date ? (
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    {date}
                  </p>
                ) : null}
              </div>

              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <ChevronIcon />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[24px] bg-white px-6 py-10 text-center ring-1 ring-slate-100">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <EmptyIcon />
      </div>

      <h2 className="mt-5 text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-slate-500">
        {body}
      </p>
    </section>
  );
}

function ErrorBox({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[22px] bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-100">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5">{body}</p>
    </section>
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
            incomingTitle: "新しい注文があります",
            incomingBubble: "注文を受けましょう",
            incomingBody: "受ける / 辞退する注文があります。",
            incomingCount: (count: number) => `${count}件の注文に返答が必要です。`,
            postBubble: "投稿しましょう",
            reviseBubble: "修正しましょう",
            emptyTitle: "今やることはありません",
            emptyBody:
              "新しい注文や進行中の案件があると、ここに表示されます。",
            errorTitle: "ToDoを取得できませんでした",
            errorBody: "時間をおいてもう一度お試しください。",
            updatedAt: "更新日",
          }
        : {
            title: "ToDo",
            subtitle: "Check only what needs action now.",
            incomingTitle: "New orders are waiting",
            incomingBubble: "Accept orders",
            incomingBody: "There are orders to accept or decline.",
            incomingCount: (count: number) =>
              `${count} order${count === 1 ? "" : "s"} need a reply.`,
            postBubble: "Post and deliver",
            reviseBubble: "Revise your work",
            emptyTitle: "Nothing to do now",
            emptyBody:
              "New orders and active orders will appear here.",
            errorTitle: "Failed to load ToDo",
            errorBody: "Please try again later.",
            updatedAt: "Updated",
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
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <ActionStyle />

      <div className="space-y-3">
        <section className="px-1 pt-1">
          <h1 className="text-[19px] font-semibold tracking-[-0.04em] text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
            {copy.subtitle}
          </p>
        </section>

        {error ? (
          <ErrorBox title={copy.errorTitle} body={copy.errorBody} />
        ) : null}

        {!hasTodos && !error ? (
          <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
        ) : null}

        <section className="space-y-2.5">
          {incomingCount > 0 ? (
            <ActionCard
              href="/creator/requests"
              icon={<ReceiptIcon />}
              title={copy.incomingTitle}
              bubble={copy.incomingBubble}
              body={copy.incomingCount(incomingCount)}
              tone="rose"
            />
          ) : null}

          {executionOrders.map((order) => {
            const label = getActionLabel(order.status, safeLocale);
            const body = getActionBody(order.status, safeLocale);
            const dateSource = order.updated_at || order.created_at;

            return (
              <ActionCard
                key={order.id}
                href={`/creator/orders/${order.id}`}
                icon={<CheckIcon />}
                title={order.title}
                bubble={
                  order.status === "revision_requested"
                    ? copy.reviseBubble
                    : copy.postBubble
                }
                body={body}
                date={`${copy.updatedAt}：${formatDate(dateSource, safeLocale)}`}
                tone={order.status === "revision_requested" ? "rose" : "slate"}
              />
            );
          })}
        </section>
      </div>
    </main>
  );
}
