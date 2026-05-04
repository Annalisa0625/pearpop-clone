// File: app/creator/accepted/[requestId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChatEmbed from "@/app/components/ChatEmbed";

type RequestDetail = {
  id: string;
  product_name: string | null;
  note: string | null;
  deadline: string | null;
  product_url: string | null;
  delivered_post_url: string | null;
  delivered_at: string | null;
  status: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP");
}

export default function CreatorAcceptedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canDeliver = detail?.status === "accepted";

  const statusLabel = useMemo(() => {
    if (!detail?.status) return "未設定";

    const map: Record<string, string> = {
      accepted: "進行中",
      delivered: "納品済み",
      completed: "完了",
      rejected: "却下",
      pending: "承認待ち",
    };

    return map[detail.status] ?? detail.status;
  }, [detail?.status]);

  const loadDetail = async () => {
    if (!requestId) return;

    setErrorMessage(null);

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        id,
        product_name,
        note,
        deadline,
        product_url,
        delivered_post_url,
        delivered_at,
        status
      `
      )
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      console.error("creator accepted detail load error:", error);
      setErrorMessage("案件情報の取得に失敗しました。");
      setDetail(null);
      return;
    }

    const nextDetail = (data as RequestDetail | null) ?? null;

    setDetail(nextDetail);
    setPostUrl(nextDetail?.delivered_post_url ?? "");
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadDetail();
      setLoading(false);
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const submitDelivery = async () => {
    if (!detail) return;

    const cleanUrl = postUrl.trim();

    if (!cleanUrl) {
      window.alert("納品URLを入力してください。");
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      window.alert("納品URLは http:// または https:// で始まるURLにしてください。");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("requests")
      .update({
        delivered_post_url: cleanUrl,
        delivered_at: nowIso,
        status: "delivered",
      })
      .eq("id", requestId);

    if (error) {
      console.error("creator legacy delivery error:", error);
      setErrorMessage("納品に失敗しました。");
      setSubmitting(false);
      return;
    }

    window.alert("納品URLを提出しました。企業の確認待ちです。");
    await loadDetail();
    setSubmitting(false);
  };

  if (loading) {
    return <p className="p-4">読み込み中...</p>;
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-600">
            {errorMessage ?? "データがありません。"}
          </p>

          <button
            type="button"
            onClick={() => router.push("/creator/jobs")}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            進行中案件へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/creator/jobs"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← 進行中案件へ戻る
        </Link>

        <Link
          href="/creator/requests"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          承認待ち一覧へ
        </Link>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-green-600">
          Legacy Request
        </p>

        <h1 className="mt-2 text-2xl font-bold">案件詳細（C側）</h1>

        <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4 text-sm">
          <p>
            <span className="font-semibold">商品名：</span>
            {detail.product_name ?? "案件名なし"}
          </p>

          <p>
            <span className="font-semibold">ステータス：</span>
            {statusLabel}
          </p>

          <p>
            <span className="font-semibold">納期：</span>
            {formatDate(detail.deadline)}
          </p>

          <p>
            <span className="font-semibold">商品URL：</span>
            {detail.product_url ? (
              <a
                href={detail.product_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-600 underline"
              >
                {detail.product_url}
              </a>
            ) : (
              "未入力"
            )}
          </p>

          <p>
            <span className="font-semibold">依頼内容：</span>
            {detail.note ?? "なし"}
          </p>

          <p>
            <span className="font-semibold">納品日時：</span>
            {formatDateTime(detail.delivered_at)}
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {(canDeliver || detail.delivered_post_url) && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">納品URL</h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            投稿URL、成果物URL、Google Drive URLなど、企業が確認できるURLを入力してください。
          </p>

          <input
            type="url"
            className="mt-4 w-full rounded border px-3 py-2"
            placeholder="https://..."
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
          />

          {detail.delivered_post_url ? (
            <a
              href={detail.delivered_post_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
            >
              納品URLを開く
            </a>
          ) : null}

          {canDeliver ? (
            <button
              type="button"
              onClick={submitDelivery}
              disabled={submitting}
              className="mt-4 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "送信中..." : "納品URLを提出"}
            </button>
          ) : null}
        </section>
      )}

      <ChatEmbed requestId={detail.id} title="案件チャット" />
    </div>
  );
}