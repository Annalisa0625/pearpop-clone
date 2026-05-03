// app/creator/requests/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ChatEmbed from "@/app/components/ChatEmbed";
import { getCommonText } from "@/lib/i18n/common";
import {
  getRequestStatusBadgeClass,
  getRequestStatusMeta,
} from "@/lib/i18n/requestStatus";
import { useAppLocale } from "@/lib/i18n/locale";

type RequestDetail = {
  id: string;
  product_name: string | null;
  product_url: string | null;
  deadline: string | null;
  note: string | null;
  status: string | null;
  created_at: string;
  delivered_post_url?: string | null;
  requested_platform?: string | null;
  requested_budget?: number | null;
  wants_secondary_use?: boolean;
};

function formatDate(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatDateTime(value: string | null | undefined, locale: "ja" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US");
}

function formatBudget(value: number | null | undefined, locale: "ja" | "en") {
  if (value == null) return locale === "ja" ? "未設定" : "Not set";

  if (locale === "ja") {
    return `¥${value.toLocaleString("ja-JP")}`;
  }

  return `JPY ${value.toLocaleString("en-US")}`;
}

export default function CreatorRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { locale } = useAppLocale();
  const t = useMemo(() => getCommonText(locale), [locale]);

  const copy = useMemo(
    () =>
      locale === "ja"
        ? {
            loading: "読み込み中...",
            loadFailed: "取得に失敗しました",
            notFound: "依頼が見つかりません",
            loadError: "取得エラー",
            dataError: "データ取得エラー",
            title: "依頼詳細",
            backToList: "一覧へ戻る",
            productName: "商品名",
            productUrl: "URL",
            requestedPlatform: "希望媒体",
            requestedBudget: "希望価格",
            secondaryUse: "二次利用希望",
            deadline: "期限",
            memo: "メモ",
            status: "ステータス",
            unset: "未設定",
            empty: "未入力",
            none: "なし",
            yes: "あり",
            no: "なし",
            createdAt: "作成日",
            deliverSectionTitle: "投稿URL提出",
            deliverPlaceholder: "Instagram投稿URLなど",
            deliverSubmit: "提出する",
            deliveredUrlLabel: "提出済みURL",
            accept: "承認する",
            reject: "拒否する",
            acceptConfirm: "本当に承認しますか？",
            rejectConfirm: "本当に拒否しますか？",
            actionError: "エラーが発生しました",
            acceptedAlert: "承認しました。",
            rejectedAlert: "拒否しました",
            deliverRequired: "投稿URLを入力してください",
            deliverFailed: "納品に失敗しました",
            deliveredAlert: "納品しました",
            networkError: "通信エラー",
          }
        : {
            loading: "Loading...",
            loadFailed: "Failed to load request.",
            notFound: "Request not found.",
            loadError: "Failed to load data.",
            dataError: "Data load error.",
            title: "Request Details",
            backToList: "Back to List",
            productName: "Product Name",
            productUrl: "URL",
            requestedPlatform: "Requested Platform",
            requestedBudget: "Requested Budget",
            secondaryUse: "Secondary Use",
            deadline: "Deadline",
            memo: "Memo",
            status: "Status",
            unset: "Not set",
            empty: "Not entered",
            none: "None",
            yes: "Yes",
            no: "No",
            createdAt: "Created At",
            deliverSectionTitle: "Submit Post URL",
            deliverPlaceholder: "Instagram post URL, etc.",
            deliverSubmit: "Submit",
            deliveredUrlLabel: "Submitted URL",
            accept: "Approve",
            reject: "Reject",
            acceptConfirm: "Are you sure you want to approve this request?",
            rejectConfirm: "Are you sure you want to reject this request?",
            actionError: "Something went wrong.",
            acceptedAlert: "Approved.",
            rejectedAlert: "Rejected.",
            deliverRequired: "Please enter the post URL.",
            deliverFailed: "Failed to submit delivery.",
            deliveredAlert: "Submitted successfully.",
            networkError: "Network error.",
          },
    [locale]
  );

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deliverUrl, setDeliverUrl] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }
    };

    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch("/api/creator/requests", {
          credentials: "include",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.message ?? copy.loadFailed);
          return;
        }

        const found = (json?.requests ?? []).find((r: RequestDetail) => r.id === id);

        if (!found) {
          setError(copy.notFound);
          return;
        }

        setRequest(found);
        setDeliverUrl(found.delivered_post_url ?? "");
      } catch (e: any) {
        setError(e?.message ?? copy.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, copy.loadFailed, copy.notFound, copy.loadError]);

  const handleAction = async (action: "accept" | "reject") => {
    const confirmed = window.confirm(
      action === "accept" ? copy.acceptConfirm : copy.rejectConfirm
    );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const res = await fetch(`/api/creator/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        window.alert(json?.message ?? copy.actionError);
        return;
      }

      if (action === "accept") {
        window.alert(copy.acceptedAlert);

        setRequest((prev) =>
          prev
            ? {
                ...prev,
                status: "accepted",
              }
            : prev
        );

        router.replace(`/creator/requests/${id}`);
        return;
      }

      window.alert(copy.rejectedAlert);
      router.push("/creator/requests");
    } catch (e: any) {
      window.alert(e?.message ?? copy.networkError);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!deliverUrl.trim()) {
      window.alert(copy.deliverRequired);
      return;
    }

    try {
      const res = await fetch(`/api/creator/requests/${id}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          url: deliverUrl,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        window.alert(json?.message ?? copy.deliverFailed);
        return;
      }

      window.alert(copy.deliveredAlert);

      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: "delivered",
              delivered_post_url: deliverUrl,
            }
          : prev
      );

      router.refresh();
    } catch (e: any) {
      window.alert(e?.message ?? copy.networkError);
    }
  };

  if (loading) {
    return <div className="p-6">{copy.loading}</div>;
  }

  if (error || !request) {
    return <div className="p-6 text-red-600">{error ?? copy.dataError}</div>;
  }

  const backPath =
    request.status === "pending" || request.status === "rejected"
      ? "/creator/requests"
      : "/creator/jobs";

  const statusMeta = getRequestStatusMeta(request.status, locale);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">{copy.title}</h1>

        <button
          onClick={() => router.push(backPath)}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {copy.backToList}
        </button>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="text-xs text-gray-500">
          {copy.createdAt}: {formatDateTime(request.created_at, locale)}
        </div>

        <div>
          <strong>{copy.productName}:</strong>{" "}
          {request.product_name ?? copy.empty}
        </div>

        <div>
          <strong>{copy.productUrl}:</strong>{" "}
          {request.product_url ? (
            <a
              href={request.product_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-blue-600 underline"
            >
              {request.product_url}
            </a>
          ) : (
            copy.empty
          )}
        </div>

        <div>
          <strong>{copy.requestedPlatform}:</strong>{" "}
          {request.requested_platform ?? copy.unset}
        </div>

        <div>
          <strong>{copy.requestedBudget}:</strong>{" "}
          {formatBudget(request.requested_budget, locale)}
        </div>

        <div>
          <strong>{copy.secondaryUse}:</strong>{" "}
          {request.wants_secondary_use ? copy.yes : copy.no}
        </div>

        <div>
          <strong>{copy.deadline}:</strong>{" "}
          {request.deadline ? formatDate(request.deadline, locale) : copy.unset}
        </div>

        <div>
          <strong>{copy.memo}:</strong> {request.note ?? copy.none}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <strong>{copy.status}:</strong>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRequestStatusBadgeClass(
              statusMeta.tone
            )}`}
          >
            {statusMeta.shortLabel}
          </span>
        </div>

        {request.delivered_post_url && (
          <div>
            <strong>{copy.deliveredUrlLabel}:</strong>{" "}
            <a
              href={request.delivered_post_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-blue-600 underline"
            >
              {request.delivered_post_url}
            </a>
          </div>
        )}
      </div>

      {request.status === "pending" && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => handleAction("accept")}
            disabled={actionLoading}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {copy.accept}
          </button>

          <button
            onClick={() => handleAction("reject")}
            disabled={actionLoading}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {copy.reject}
          </button>
        </div>
      )}

      {request.status === "accepted" && (
        <div className="mt-6 rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">{copy.deliverSectionTitle}</h2>

          <input
            type="text"
            placeholder={copy.deliverPlaceholder}
            value={deliverUrl}
            onChange={(e) => setDeliverUrl(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />

          <button
            onClick={handleDeliver}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-white"
          >
            {copy.deliverSubmit}
          </button>
        </div>
      )}

      {(request.status === "accepted" ||
        request.status === "delivered" ||
        request.status === "completed") &&
        userId && <ChatEmbed requestId={request.id} userId={userId} />}
    </div>
  );
}