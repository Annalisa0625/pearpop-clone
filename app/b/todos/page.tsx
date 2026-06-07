// File: app/b/todos/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppLocale } from "@/lib/i18n/locale";

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  delivered_post_url: string | null;
  creator_accept_deadline: string | null;
  auto_complete_at: string | null;
  revision_requested_at: string | null;
};

type TodoSummary = {
  waitingCount: number;
  reviewCount: number;
  revisionCount: number;
};

function isWaitingOrder(order: OrderRow) {
  return (
    order.status === "authorized_pending_creator" &&
    order.payment_status === "authorized"
  );
}

function isReviewOrder(order: OrderRow) {
  return order.status === "delivered";
}

function isRevisionOrder(order: OrderRow) {
  return order.status === "revision_requested";
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
      <path
        d="M21 11.1V12a9 9 0 1 1-5.3-8.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 11.8 2.2 2.2L21 4.5"
        stroke="currentColor"
        strokeWidth="2.1"
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
    <main className="mx-auto max-w-4xl">
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
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
  body: string;
  accent?: "rose" | "amber" | "slate";
}) {
  const iconClass =
    accent === "rose"
      ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
      : accent === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <Link href={href} className="block">
      <article className="flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 transition active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-[0_22px_60px_rgba(15,23,42,0.065)]">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ring-1 ${iconClass}`}
        >
          <CheckIcon />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-black tracking-[-0.035em] text-slate-950">
            {title}
          </h2>

          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-400">
            {body}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <ChevronIcon />
        </div>
      </article>
    </Link>
  );
}

export default function CompanyTodosPage() {
  const { locale } = useAppLocale();
  const safeLocale: "ja" | "en" = locale === "en" ? "en" : "ja";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            title: "ToDo",
            subtitle: "今確認することだけをまとめています。",
            waitingTitle: "クリエイターの返答待ちです",
            waitingBody: "注文に対する受ける / 辞退の返答を待っています。",
            reviewTitle: "納品確認待ちがあります",
            reviewBody: "提出されたURLを確認して、完了または修正依頼を選択してください。",
            revisionTitle: "修正依頼中の注文があります",
            revisionBody: "クリエイターの再対応を待っています。",
            emptyTitle: "今確認することはありません",
            emptyBody:
              "返答待ち・納品確認待ち・修正依頼中の注文があると、ここに表示されます。",
            errorTitle: "ToDoを取得できませんでした",
            errorBody: "時間をおいてもう一度お試しください。",
            countSuffix: "件",
          }
        : {
            title: "ToDo",
            subtitle: "Only the items that need attention now.",
            waitingTitle: "Waiting for creator reply",
            waitingBody: "Orders are waiting for accept or decline.",
            reviewTitle: "Delivery review is waiting",
            reviewBody: "Review submitted URLs and complete or request revision.",
            revisionTitle: "Revision requests are in progress",
            revisionBody: "Waiting for creators to respond to revision requests.",
            emptyTitle: "Nothing to check now",
            emptyBody:
              "Waiting, delivery review, and revision items will appear here.",
            errorTitle: "Failed to load ToDo",
            errorBody: "Please try again later.",
            countSuffix: "",
          },
    [safeLocale]
  );

  const [summary, setSummary] = useState<TodoSummary>({
    waitingCount: 0,
    reviewCount: 0,
    revisionCount: 0,
  });
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
        setSummary({
          waitingCount: 0,
          reviewCount: 0,
          revisionCount: 0,
        });
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
          delivered_post_url,
          creator_accept_deadline,
          auto_complete_at,
          revision_requested_at
        `
        )
        .eq("b_user_id", user.id)
        .in("status", [
          "authorized_pending_creator",
          "delivered",
          "revision_requested",
        ])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("company todo load error:", orderError);
        setError(true);
        setSummary({
          waitingCount: 0,
          reviewCount: 0,
          revisionCount: 0,
        });
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as unknown as OrderRow[]).filter(Boolean);

      setSummary({
        waitingCount: rows.filter(isWaitingOrder).length,
        reviewCount: rows.filter(isReviewOrder).length,
        revisionCount: rows.filter(isRevisionOrder).length,
      });

      setLoading(false);
    } catch (error) {
      console.error("company todo load error:", error);
      setError(true);
      setSummary({
        waitingCount: 0,
        reviewCount: 0,
        revisionCount: 0,
      });
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    const channel = supabase
      .channel("company-todos-realtime")
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

  const hasTodos =
    summary.waitingCount > 0 ||
    summary.reviewCount > 0 ||
    summary.revisionCount > 0;

  return (
    <main className="mx-auto max-w-4xl">
      <section className="mb-4 overflow-hidden rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
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
        {summary.reviewCount > 0 ? (
          <TodoItem
            href="/b/orders"
            title={copy.reviewTitle}
            body={
              safeLocale === "ja"
                ? `${summary.reviewCount}${copy.countSuffix}の注文で納品確認が必要です。`
                : `${summary.reviewCount} order${
                    summary.reviewCount === 1 ? "" : "s"
                  } need delivery review.`
            }
            accent="rose"
          />
        ) : null}

        {summary.waitingCount > 0 ? (
          <TodoItem
            href="/b/orders"
            title={copy.waitingTitle}
            body={
              safeLocale === "ja"
                ? `${summary.waitingCount}${copy.countSuffix}の注文がクリエイターの返答待ちです。`
                : `${summary.waitingCount} order${
                    summary.waitingCount === 1 ? "" : "s"
                  } are waiting for creator reply.`
            }
            accent="amber"
          />
        ) : null}

        {summary.revisionCount > 0 ? (
          <TodoItem
            href="/b/orders"
            title={copy.revisionTitle}
            body={
              safeLocale === "ja"
                ? `${summary.revisionCount}${copy.countSuffix}の注文で修正依頼中です。`
                : `${summary.revisionCount} order${
                    summary.revisionCount === 1 ? "" : "s"
                  } are waiting for revisions.`
            }
            accent="slate"
          />
        ) : null}
      </section>
    </main>
  );
}