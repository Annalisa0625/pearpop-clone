"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type QuoteStatus = "sent" | "accepted" | "declined" | "expired" | "cancelled";
type QuoteDecision = "accepted" | "declined";

type DecisionResponse =
  | {
      ok: true;
      quote: {
        status: QuoteDecision;
      };
    }
  | { ok: false; error: string; setupRequired?: boolean };

function effectiveStatus(status: QuoteStatus, validUntil: string): QuoteStatus {
  if (status !== "sent") return status;
  const expiry = new Date(validUntil).getTime();
  return !Number.isNaN(expiry) && expiry <= Date.now() ? "expired" : status;
}

export default function QuoteDecisionActions({
  quoteId,
  initialStatus,
  validUntil,
}: {
  quoteId: string;
  initialStatus: QuoteStatus;
  validUntil: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<QuoteStatus>(() =>
    effectiveStatus(initialStatus, validUntil)
  );
  const [submitting, setSubmitting] = useState<QuoteDecision | null>(null);
  const [error, setError] = useState("");

  const expiryText = useMemo(() => {
    const date = new Date(validUntil);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [validUntil]);

  const decide = async (decision: QuoteDecision) => {
    if (submitting || status !== "sent") return;

    const confirmed = window.confirm(
      decision === "accepted"
        ? "この見積もりを承認しますか？承認後は見送りに変更できません。"
        : "この見積もりを見送りますか？見送り後は承認に変更できません。"
    );
    if (!confirmed) return;

    setSubmitting(decision);
    setError("");

    try {
      const response = await fetch(`/api/company/quotes/${quoteId}/decision`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = (await response.json()) as DecisionResponse;
      if (!response.ok || !body.ok) {
        throw new Error(body.ok ? "回答を保存できませんでした。" : body.error);
      }

      setStatus(body.quote.status);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "回答を保存できませんでした。時間を置いてもう一度お試しください。"
      );
    } finally {
      setSubmitting(null);
    }
  };

  if (status === "accepted") {
    return (
      <section className="rounded-[20px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200/70">
        <p className="text-sm font-bold text-emerald-950">見積もりを承認しました</p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          クリエイター側にも承認状況が反映されます。支払い・正式注文の手続きは別途ご案内します。
        </p>
      </section>
    );
  }

  if (status === "declined") {
    return (
      <section className="rounded-[20px] bg-slate-100 px-5 py-5 ring-1 ring-slate-200/80">
        <p className="text-sm font-bold text-slate-950">今回は見送りました</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          回答状況はクリエイター側へ反映されています。
        </p>
      </section>
    );
  }

  if (status === "expired") {
    return (
      <section className="rounded-[20px] bg-amber-50 px-5 py-5 ring-1 ring-amber-200/80">
        <p className="text-sm font-bold text-amber-950">見積もりの有効期限が切れています</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          内容を進めたい場合は、クリエイターへ新しい見積もりをご依頼ください。
        </p>
      </section>
    );
  }

  if (status === "cancelled") {
    return (
      <section className="rounded-[20px] bg-slate-100 px-5 py-5 ring-1 ring-slate-200/80">
        <p className="text-sm font-bold text-slate-950">この見積もりは取り消されています</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/70">
      <div>
        <p className="text-sm font-bold text-slate-950">この見積もりに回答する</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          承認しても、この画面では決済されません。支払い・正式注文は次の手続きで進みます。
        </p>
        {expiryText ? (
          <p className="mt-2 text-xs font-medium text-slate-400">回答期限：{expiryText}</p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void decide("accepted")}
          disabled={Boolean(submitting)}
          className="h-12 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting === "accepted" ? "承認しています…" : "見積もりを承認する"}
        </button>
        <button
          type="button"
          onClick={() => void decide("declined")}
          disabled={Boolean(submitting)}
          className="h-12 rounded-full bg-white px-5 text-sm font-bold text-slate-700 ring-1 ring-slate-300 transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting === "declined" ? "保存しています…" : "今回は見送る"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-[14px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
