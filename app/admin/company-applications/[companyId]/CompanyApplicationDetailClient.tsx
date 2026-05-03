// app/admin/company-applications/[companyId]/CompanyApplicationDetailClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CompanyApplication = {
  id: string;
  company_name: string | null;
  description: string | null;
  contact_email: string | null;
  approval_status: "pending" | "approved" | "rejected" | string;
  created_at: string | null;
  website_url: string | null;
  phone_number: string | null;
  usage_purpose: string | null;
};

export default function CompanyApplicationDetailClient({
  companyId,
}: {
  companyId: string;
}) {
  const router = useRouter();

  const [company, setCompany] = useState<CompanyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/company-applications/${companyId}`, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      if (!res.ok) {
        throw new Error("failed to fetch company application");
      }

      const data = await res.json();
      setCompany(data.company ?? null);
    } catch (e) {
      console.error(e);
      setError("申請情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleAction = async (action: "approve" | "reject") => {
    if (!company) return;

    const ok = confirm(action === "approve" ? "承認しますか？" : "却下しますか？");
    if (!ok) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/company-applications/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({
          companyId: company.id,
          action,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.error ?? "action failed");
      }

      const nextStatus = result.approval_status as CompanyApplication["approval_status"];

      setCompany((prev) =>
        prev ? { ...prev, approval_status: nextStatus } : prev
      );

      alert(action === "approve" ? "承認しました" : "却下しました");

      router.push(`/admin/company-applications?refresh=${Date.now()}`);
    } catch (e) {
      console.error(e);
      alert("操作に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (error) return <div className="p-6 font-bold text-red-600">{error}</div>;
  if (!company) return <div className="p-6">データがありません</div>;

  const normalizedStatus =
    typeof company.approval_status === "string"
      ? company.approval_status.trim().toLowerCase()
      : "";

  const statusLabel =
    normalizedStatus === "pending"
      ? "未承認"
      : normalizedStatus === "approved"
      ? "承認済"
      : "却下";

  const statusClass =
    normalizedStatus === "pending"
      ? "text-orange-600"
      : normalizedStatus === "approved"
      ? "text-green-600"
      : "text-gray-600";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-bold">🏢 Company 申請詳細</h1>

      <div className="space-y-4 rounded border p-6">
        <div>
          <div className="text-sm text-gray-500">会社名</div>
          <div className="font-semibold">{company.company_name ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">連絡先メール</div>
          <div>{company.contact_email ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">会社HP / ECサイト URL</div>
          {company.website_url ? (
            <a
              href={company.website_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-blue-600 underline"
            >
              {company.website_url}
            </a>
          ) : (
            <div>-</div>
          )}
        </div>

        <div>
          <div className="text-sm text-gray-500">電話番号</div>
          <div>{company.phone_number ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">利用目的</div>
          <div>{company.usage_purpose ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">説明</div>
          <div className="whitespace-pre-wrap">{company.description ?? "-"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">申請日</div>
          <div>
            {company.created_at
              ? new Date(company.created_at).toLocaleString()
              : "-"}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">状態</div>
          <div className={`font-bold ${statusClass}`}>{statusLabel}</div>
        </div>
      </div>

      {normalizedStatus === "pending" ? (
        <div className="flex gap-3">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={submitting}
            onClick={() => handleAction("approve")}
          >
            承認
          </button>
          <button
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={submitting}
            onClick={() => handleAction("reject")}
          >
            却下
          </button>
        </div>
      ) : (
        <button
          className="rounded border px-4 py-2"
          onClick={() =>
            router.push(`/admin/company-applications?refresh=${Date.now()}`)
          }
        >
          一覧へ戻る
        </button>
      )}
    </div>
  );
}