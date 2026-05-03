//app/b/requests/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function CompanyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useAppLocale();

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            loading: "読み込み中...",
            title: "リクエスト詳細",
            backToList: "一覧へ戻る",
            productName: "商品名",
            productUrl: "商品URL",
            requestedPlatform: "希望媒体",
            requestedBudget: "希望価格",
            secondaryUse: "二次利用希望",
            deadline: "納期",
            memo: "メモ",
            status: "ステータス",
            deliveredUrl: "投稿URL（納品）",
            approveDelivery: "納品を承認する",
            approveFailed: "承認に失敗しました",
            approveSuccess: "納品を承認しました",
            unknown: "unknown",
            empty: "未入力",
            notSet: "未設定",
            none: "なし",
            yes: "あり",
            no: "なし",
          }
        : {
            loading: "Loading...",
            title: "Request Details",
            backToList: "Back to List",
            productName: "Product Name",
            productUrl: "Product URL",
            requestedPlatform: "Requested Platform",
            requestedBudget: "Requested Budget",
            secondaryUse: "Secondary Use",
            deadline: "Deadline",
            memo: "Memo",
            status: "Status",
            deliveredUrl: "Delivered Post URL",
            approveDelivery: "Approve Delivery",
            approveFailed: "Failed to approve delivery",
            approveSuccess: "Delivery approved",
            unknown: "unknown",
            empty: "Not entered",
            notSet: "Not set",
            none: "None",
            yes: "Yes",
            no: "No",
          },
    [locale]
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

    load();
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
    return <div className="p-6">{copy.loading}</div>;
  }

  const backPath =
    request.status === "pending" || request.status === "rejected"
      ? "/b/requests"
      : "/b/jobs";

  const statusMeta = getRequestStatusMeta(request.status, locale);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-bold">{copy.title}</h1>

        <button
          onClick={() => router.push(backPath)}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {copy.backToList}
        </button>
      </div>

      <div className="space-y-3 rounded border p-4">
        <p>
          {copy.productName}：
          <span className="ml-1 font-semibold">
            {request.product_name ?? copy.empty}
          </span>
        </p>

        <p>
          {copy.productUrl}：
          <span className="ml-1 font-semibold break-all">
            {request.product_url ?? copy.empty}
          </span>
        </p>

        <p>
          {copy.requestedPlatform}：
          <span className="ml-1 font-semibold">
            {request.requested_platform ?? copy.notSet}
          </span>
        </p>

        <p>
          {copy.requestedBudget}：
          <span className="ml-1 font-semibold">
            {formatBudget(request.requested_budget, locale)}
          </span>
        </p>

        <p>
          {copy.secondaryUse}：
          <span className="ml-1 font-semibold">
            {request.wants_secondary_use ? copy.yes : copy.no}
          </span>
        </p>

        <p>
          {copy.deadline}：
          <span className="ml-1 font-semibold">
            {request.deadline ? formatDate(request.deadline, locale) : copy.notSet}
          </span>
        </p>

        <p>
          {copy.memo}：
          <span className="ml-1 font-semibold">{request.note ?? copy.none}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span>{copy.status}：</span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRequestStatusBadgeClass(
              statusMeta.tone
            )}`}
          >
            {statusMeta.shortLabel || copy.unknown}
          </span>
        </div>
      </div>

      {request.delivered_post_url && (
        <div className="rounded border p-4">
          <p className="mb-2 font-semibold">{copy.deliveredUrl}</p>

          <a
            href={request.delivered_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-600 underline"
          >
            {request.delivered_post_url}
          </a>

          {request.status === "delivered" && (
            <button
              onClick={approve}
              className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              {copy.approveDelivery}
            </button>
          )}
        </div>
      )}

      {(request.status === "accepted" ||
        request.status === "delivered" ||
        request.status === "completed") &&
        userId && <ChatEmbed requestId={request.id} userId={userId} />}
    </div>
  );
}