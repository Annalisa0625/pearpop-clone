// File: app/components/OrderReferenceAssets.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ReferenceAsset = {
  id: string;
  order_id: string;
  file_name: string;
  file_type: "image" | "pdf";
  mime_type: string;
  size_bytes: number;
  sort_order: number;
  created_at: string;
  signed_url: string | null;
};

type ReferenceAssetsResponse = {
  assets?: ReferenceAsset[];
  error?: string;
};

type OrderReferenceAssetsProps = {
  orderId: string;
};

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "サイズ不明";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeKb = sizeBytes / 1024;

  if (sizeKb < 1024) {
    return `${sizeKb.toFixed(sizeKb >= 100 ? 0 : 1)} KB`;
  }

  const sizeMb = sizeKb / 1024;

  return `${sizeMb.toFixed(sizeMb >= 10 ? 1 : 2)} MB`;
}

function FileUnavailable() {
  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 px-4 text-center text-sm font-semibold text-slate-500">
      ファイルを表示できません
    </div>
  );
}

export default function OrderReferenceAssets({
  orderId,
}: OrderReferenceAssetsProps) {
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAssets = useCallback(async () => {
    if (!orderId) {
      setAssets([]);
      setErrorMessage("注文IDを確認できませんでした。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("ログイン情報を確認できませんでした。");
      }

      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/reference-assets`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as ReferenceAssetsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "参考資料を取得できませんでした。");
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    } catch (error) {
      console.error("Failed to load order reference assets:", error);

      setAssets([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "参考資料を取得できませんでした。"
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  if (isLoading) {
    return (
      <section className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[0.08em] text-slate-400">
          参考資料
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-5">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
          />
          <p className="text-sm font-semibold text-slate-500">
            添付ファイルを読み込んでいます
          </p>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="mt-6 rounded-[24px] border border-rose-100 bg-rose-50 p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[0.08em] text-rose-500">
          参考資料
        </p>

        <p className="mt-3 text-sm font-semibold leading-7 text-rose-700">
          {errorMessage}
        </p>

        <button
          type="button"
          onClick={() => void loadAssets()}
          className="mt-4 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
        >
          再読み込み
        </button>
      </section>
    );
  }

  if (assets.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold tracking-[0.08em] text-slate-400">
          参考資料
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          依頼時に添付された画像やPDFです。
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {assets.map((asset) => {
          const canOpen = Boolean(asset.signed_url);
          const isImage = asset.file_type === "image";

          return (
            <article
              key={asset.id}
              className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
            >
              {canOpen && isImage ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      asset.signed_url as string,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="group block w-full bg-slate-100 text-left"
                  aria-label={`${asset.file_name}を開く`}
                >
                  <img
                    src={asset.signed_url as string}
                    alt={asset.file_name}
                    className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                </button>
              ) : canOpen && asset.file_type === "pdf" ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      asset.signed_url as string,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-slate-700 transition hover:bg-slate-200"
                  aria-label={`${asset.file_name}を開く`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sm font-black shadow-sm"
                  >
                    PDF
                  </span>
                  <span className="text-sm font-bold">PDFを開く</span>
                </button>
              ) : (
                <FileUnavailable />
              )}

              <div className="p-4">
                <p className="break-all text-sm font-bold leading-6 text-slate-900">
                  {asset.file_name}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                  <span>{asset.file_type === "image" ? "IMAGE" : "PDF"}</span>
                  <span aria-hidden="true">/</span>
                  <span>{formatFileSize(asset.size_bytes)}</span>
                </div>

                {canOpen ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        asset.signed_url as string,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
                  >
                    ファイルを開く
                    <span aria-hidden="true">↗</span>
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}