// File: app/b/requests/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ChatEmbed from "@/app/components/ChatEmbed";
import { useAppLocale } from "@/lib/i18n/locale";
import {
  getRequestStatusBadgeClass,
  getRequestStatusMeta,
} from "@/lib/i18n/requestStatus";

type RequestDetail = {
  id: string;
  status: string | null;
  product_name: string | null;
  product_url: string | null;
  deadline: string | null;
  note: string | null;
  requested_platform: string | null;
  requested_budget: number | null;
  wants_secondary_use: boolean | null;
  delivered_post_url: string | null;
  creator_user_id: string;
};

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatBudget(value: number | null | undefined, locale: "ja" | "en") {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";
  if (locale === "ja") {
    return `¥${value.toLocaleString("ja-JP")}`;
  }
  return `JPY ${value.toLocaleString("en-US")}`;
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

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span
        className={`max-w-[65%] text-right text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-800"
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
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
      <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
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
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
        {value?.trim() || emptyLabel}
      </p>
    </div>
  );
}

export default function CompanyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useAppLocale();
  const safeLocale = locale === "en" ? "en" : "ja";

  const copy = useMemo(
    () =>
      safeLocale === "ja"
        ? {
            loading: "読み込み中...",
            title: "注文詳細",
            backToList: "一覧へ戻る",
            productInfo: "注文内容",
            productName: "商品名・案件名",
            productUrl: "商品URL",
            requestedPlatform: "希望SNS",
            requestedBudget: "希望価格",
            secondaryUse: "二次利用希望",
            deadline: "希望日",
            memo: "依頼内容",
            status: "ステータス",
            deliveredUrl: "納品URL",
            approveDelivery: "完了する",
            approveFailed: "完了処理に失敗しました",
            approveSuccess: "完了しました",
            unknown: "unknown",
            empty: "未入力",
            notSet: "未設定",
            none: "なし",
            yes: "あり",
            no: "なし",
            chatTitle: "注文チャット",
            waitingTitle: "返答待ちです",
            waitingBody:
              "インフルエンサーが承認すると注文が開始されます。",
            activeTitle: "注文は進行中です",
            activeBody:
              "必要な確認や連絡はチャットで行えます。",
            deliveredTitle: "納品内容を確認してください",
            deliveredBody:
              "問題なければ完了できます。完了後は原則として修正依頼・返金はできません。",
            completedTitle: "この注文は完了しています",
            completedBody:
              "追加依頼がある場合は、新しい注文として相談してください。",
          }
        : {
            loading: "Loading...",
            title: "Order details",
            backToList: "Back",
            productInfo: "Order details",
            productName: "Product / Campaign",
            productUrl: "Product URL",
            requestedPlatform: "Requested platform",
            requestedBudget: "Requested budget",
            secondaryUse: "Secondary use",
            deadline: "Preferred date",
            memo: "Requirements",
            status: "Status",
            deliveredUrl: "Delivery URL",
            approveDelivery: "Complete",
            approveFailed: "Failed to complete",
            approveSuccess: "Completed",
            unknown: "unknown",
            empty: "Not entered",
            notSet: "Not set",
            none: "None",
            yes: "Yes",
            no: "No",
            chatTitle: "Order chat",
            waitingTitle: "Waiting for reply",
            waitingBody:
              "The order begins once the influencer accepts.",
            activeTitle: "Order is in progress",
            activeBody:
              "Use chat for any necessary confirmation.",
            deliveredTitle: "Review the delivery",
            deliveredBody:
              "Complete the order if everything is okay. Revisions and refunds are generally unavailable after completion.",
            completedTitle: "This order is completed",
            completedBody:
              "For additional work, please discuss a new order.",
          },
    [safeLocale]
  );

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }

      const { data, error } = await supabase
        .from("requests")
        .select(`
          id,
          status,
          product_name,
          product_url,
          deadline,
          note,
          requested_platform,
          requested_budget,
          wants_secondary_use,
          delivered_post_url,
          creator_user_id
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("request load error:", error);
        return;
      }

      setRequest(data);
    };

    void load();
  }, [id]);

  const approve = async () => {
    const { error } = await supabase
      .from("requests")
      .update({
        status: "completed",
        company_approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      window.alert(copy.approveFailed);
      return;
    }

    window.alert(copy.approveSuccess);

    const { data, error: reloadError } = await supabase
      .from("requests")
      .select(`
        id,
        status,
        product_name,
        product_url,
        deadline,
        note,
        requested_platform,
        requested_budget,
        wants_secondary_use,
        delivered_post_url,
        creator_user_id
      `)
      .eq("id", id)
      .single();

    if (reloadError) {
      console.error("reload error:", reloadError);
      return;
    }

    setRequest(data);
  };

  if (!request) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f8f9fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.045)]">
          <p className="text-sm font-bold text-slate-500">{copy.loading}</p>
        </div>
      </div>
    );
  }

  const backPath =
    request.status === "pending" || request.status === "rejected"
      ? "/b/requests"
      : "/b/jobs";

  const statusMeta = getRequestStatusMeta(request.status, safeLocale);

  const notice =
    request.status === "pending"
      ? { title: copy.waitingTitle, body: copy.waitingBody }
      : request.status === "delivered"
      ? { title: copy.deliveredTitle, body: copy.deliveredBody }
      : request.status === "completed"
      ? { title: copy.completedTitle, body: copy.completedBody }
      : { title: copy.activeTitle, body: copy.activeBody };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white via-rose-50/35 to-transparent" />
      <div className="pointer-events-none absolute right-[-260px] top-[100px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 pb-10 md:px-6 md:py-8">
        <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.055)] md:px-7 md:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill
                  className={getRequestStatusBadgeClass(statusMeta.tone)}
                >
                  {statusMeta.shortLabel || copy.unknown}
                </Pill>
              </div>

              <h1 className="mt-4 text-[28px] font-black tracking-[-0.055em] text-slate-950 md:text-[38px]">
                {request.product_name || copy.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {notice.body}
              </p>
            </div>

            <button
              onClick={() => router.push(backPath)}
              className="inline-flex w-fit items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-200"
            >
              {copy.backToList}
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[26px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] md:p-6">
          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
            {notice.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            {notice.body}
          </p>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5">
            <SectionCard title={copy.productInfo}>
              <div className="grid gap-3">
                <DetailRow
                  label={copy.productName}
                  value={request.product_name ?? copy.empty}
                  strong
                />

                <DetailRow
                  label={copy.productUrl}
                  value={
                    request.product_url ? (
                      <a
                        href={request.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-600 underline underline-offset-4"
                      >
                        {request.product_url}
                      </a>
                    ) : (
                      copy.empty
                    )
                  }
                />

                <DetailRow
                  label={copy.requestedPlatform}
                  value={request.requested_platform ?? copy.notSet}
                />

                <DetailRow
                  label={copy.requestedBudget}
                  value={formatBudget(request.requested_budget, safeLocale)}
                />

                <DetailRow
                  label={copy.secondaryUse}
                  value={request.wants_secondary_use ? copy.yes : copy.no}
                />

                <DetailRow
                  label={copy.deadline}
                  value={
                    request.deadline
                      ? formatDate(request.deadline, safeLocale)
                      : copy.notSet
                  }
                />
              </div>

              <div className="mt-4">
                <TextBlock
                  label={copy.memo}
                  value={request.note}
                  emptyLabel={copy.none}
                />
              </div>
            </SectionCard>

            {(request.status === "accepted" ||
              request.status === "delivered" ||
              request.status === "completed") &&
              userId && (
                <SectionCard title={copy.chatTitle}>
                  <ChatEmbed requestId={request.id} userId={userId} />
                </SectionCard>
              )}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {request.delivered_post_url ? (
              <SectionCard title={copy.deliveredUrl}>
                <a
                  href={request.delivered_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 underline-offset-4 transition hover:bg-slate-200 hover:underline"
                >
                  {copy.deliveredUrl}
                </a>

                {request.status === "delivered" ? (
                  <button
                    onClick={approve}
                    className="mt-4 w-full rounded-full bg-[#ff5f67] px-5 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(255,95,103,0.2)] transition active:scale-[0.98]"
                  >
                    {copy.approveDelivery}
                  </button>
                ) : null}
              </SectionCard>
            ) : null}

            <SectionCard title={copy.status}>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <DetailRow
                  label={copy.status}
                  value={statusMeta.shortLabel || copy.unknown}
                  strong
                />
                <DetailRow
                  label={copy.deadline}
                  value={
                    request.deadline
                      ? formatDate(request.deadline, safeLocale)
                      : copy.notSet
                  }
                />
              </div>

              <Link
                href="/b/creators"
                className="mt-5 flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
              >
                {safeLocale === "ja"
                  ? "インフルエンサーを探す"
                  : "Find influencers"}
              </Link>
            </SectionCard>
          </aside>
        </section>
      </div>
    </div>
  );
}