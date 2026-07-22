"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CreatorLinkInquiryInboxResponse } from "@/lib/trendre-link/inquiry-inbox";

type Counts = {
  trendMart: number;
  trendreLink: number;
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 9.5h16M6 9.5v9h12v-9M5 4h14l1 5.5H4L5 4Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18.5v-5h6v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function LinkInquiryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrderRow({ href, icon, eyebrow, title, body, count }: { href: string; icon: React.ReactNode; eyebrow: string; title: string; body: string; count: number }) {
  return (
    <Link href={href} className="group flex items-center gap-4 border-b border-slate-200/80 py-5 last:border-b-0 active:opacity-70">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</span>
        <span className="mt-1 block text-[17px] font-bold tracking-[-0.03em] text-slate-950">{title}</span>
        <span className="mt-1 block text-sm font-medium leading-6 text-slate-500">{body}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {count > 0 ? <span className="flex min-w-7 items-center justify-center rounded-full bg-[#ff4765] px-2 py-1 text-xs font-bold text-white">{count > 99 ? "99+" : count}</span> : null}
        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"><ArrowIcon /></span>
      </span>
    </Link>
  );
}

export default function CreatorOrdersPage() {
  const { locale } = useAppLocale();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [counts, setCounts] = useState<Counts>({ trendMart: 0, trendreLink: 0 });
  const [loading, setLoading] = useState(true);

  const copy = locale === "ja"
    ? {
        title: "Order",
        description: "成立前の注文・相談・見積もり依頼をまとめて確認します。",
        trendMartEyebrow: "Trend Mart",
        trendMartTitle: "直接注文",
        trendMartBody: "届いた注文を72時間以内に承認または辞退します。",
        linkEyebrow: "Trendre Link",
        linkTitle: "問い合わせ・見積もり依頼",
        linkBody: "相談内容を確認して、返信・見積もり・辞退へ進みます。",
        loading: "読み込み中…",
      }
    : {
        title: "Order",
        description: "Review orders, inquiries, and quote requests before they become jobs.",
        trendMartEyebrow: "Trend Mart",
        trendMartTitle: "Direct orders",
        trendMartBody: "Accept or decline new orders within 72 hours.",
        linkEyebrow: "Trendre Link",
        linkTitle: "Inquiries and quote requests",
        linkBody: "Review the request, reply, send a quote, or decline.",
        loading: "Loading…",
      };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/login?next=/creator/orders");
        return;
      }

      const [orderResult, inquiryResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("creator_user_id", user.id)
          .in("status", ["pending", "authorized_pending_creator", "checkout_pending"]),
        fetch("/api/creator/link/inquiries", { credentials: "same-origin", cache: "no-store" })
          .then(async (response) => ({ response, body: (await response.json().catch(() => null)) as CreatorLinkInquiryInboxResponse | null }))
          .catch(() => null),
      ]);

      if (cancelled) return;

      const inquiryCount = inquiryResult?.response.ok && inquiryResult.body?.ok
        ? inquiryResult.body.counts.new + inquiryResult.body.counts.active
        : 0;

      setCounts({ trendMart: orderResult.count ?? 0, trendreLink: inquiryCount });
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <div className="mx-auto w-full max-w-3xl pb-4 pt-3">
      <section className="px-1 pb-6 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff4765]">Creator workspace</p>
        <h1 className="mt-2 text-[34px] font-bold tracking-[-0.06em] text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-500">{copy.description}</p>
      </section>

      <section className="rounded-[24px] bg-white px-5 ring-1 ring-slate-200/70">
        {loading ? (
          <div className="py-12 text-center text-sm font-medium text-slate-400">{copy.loading}</div>
        ) : (
          <>
            <OrderRow href="/creator/requests" icon={<StoreIcon />} eyebrow={copy.trendMartEyebrow} title={copy.trendMartTitle} body={copy.trendMartBody} count={counts.trendMart} />
            <OrderRow href="/creator/link/inquiries" icon={<LinkInquiryIcon />} eyebrow={copy.linkEyebrow} title={copy.linkTitle} body={copy.linkBody} count={counts.trendreLink} />
          </>
        )}
      </section>
    </div>
  );
}
