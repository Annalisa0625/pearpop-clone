"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type QuoteStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

type QuoteDecision = "accepted" | "declined";

type DecisionResponse =
  | {
      ok: true;
      quote: {
        status: QuoteDecision;
      };
    }
  | {
      ok: false;
      error: string;
      setupRequired?: boolean;
    };

type CheckoutResponse =
  | {
      ok: true;
      url?: string;
      redirectTo?: string;
      checkoutSessionId: string;
      duplicate?: boolean;
      completed?: boolean;
    }
  | {
      ok: false;
      error: string;
      setupRequired?: boolean;
    };

function effectiveStatus(
  status: QuoteStatus,
  validUntil: string
): QuoteStatus {
  if (status !== "sent") return status;

  const expiry = new Date(validUntil).getTime();

  return !Number.isNaN(expiry) && expiry <= Date.now()
    ? "expired"
    : status;
}

export default function QuoteDecisionActions({
  quoteId,
  initialStatus,
  validUntil,
  initialOrderId,
}: {
  quoteId: string;
  initialStatus: QuoteStatus;
  validUntil: string;
  initialOrderId: string | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<QuoteStatus>(() =>
    effectiveStatus(initialStatus, validUntil)
  );

  const [submitting, setSubmitting] =
    useState<QuoteDecision | null>(null);

  const [checkoutSubmitting, setCheckoutSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const expiryText = useMemo(() => {
    const date = new Date(validUntil);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [validUntil]);

  const decide = async (decision: QuoteDecision) => {
    if (submitting || status !== "sent") {
      return;
    }

    const confirmed = window.confirm(
      decision === "accepted"
        ? "この見積もりを承認しますか？承認後は見送りに変更できません。"
        : "この見積もりを見送りますか？見送り後は承認に変更できません。"
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(decision);
    setError("");

    try {
      const response = await fetch(
        `/api/company/quotes/${quoteId}/decision`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            decision,
          }),
        }
      );

      const body =
        (await response.json()) as DecisionResponse;

      if (!response.ok || !body.ok) {
        throw new Error(
          body.ok
            ? "回答を保存できませんでした。"
            : body.error
        );
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

  const startCheckout = async () => {
    if (
      checkoutSubmitting ||
      status !== "accepted"
    ) {
      return;
    }

    setCheckoutSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/company/quotes/${quoteId}/checkout`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const body =
        (await response.json()) as CheckoutResponse;

      if (!response.ok || !body.ok) {
        throw new Error(
          body.ok
            ? "決済画面を開けませんでした。"
            : body.error
        );
      }

      const destination =
        body.url || body.redirectTo;

      if (!destination) {
        throw new Error(
          "決済画面のURLを取得できませんでした。"
        );
      }

      window.location.assign(destination);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "決済画面を開けませんでした。時間を置いてもう一度お試しください。"
      );

      setCheckoutSubmitting(false);
    }
  };

  if (status === "accepted") {
    return (
      <section className="rounded-[22px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200/70">
        <p className="text-sm font-bold text-emerald-950">
          見積もりを承認しました
        </p>

        <p className="mt-2 text-sm leading-6 text-emerald-800">
          内容とお支払い金額を確認し、Stripeの安全な決済画面へ進んでください。
        </p>

        {initialOrderId ? (
          <a
            href={`/b/orders/${initialOrderId}`}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            正式注文を確認する
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={checkoutSubmitting}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutSubmitting
              ? "決済画面を準備しています…"
              : "支払い方法の確認へ進む"}
          </button>
        )}

        <p className="mt-3 text-xs leading-5 text-emerald-700">
          このボタンを押しただけでは、支払いは確定しません。
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[14px] bg-white px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (status === "declined") {
    return (
      <section className="rounded-[20px] bg-slate-100 px-5 py-5 ring-1 ring-slate-200/80">
        <p className="text-sm font-bold text-slate-950">
          今回は見送りました
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          回答状況はクリエイター側へ反映されています。
        </p>
      </section>
    );
  }

  if (status === "expired") {
    return (
      <section className="rounded-[20px] bg-amber-50 px-5 py-5 ring-1 ring-amber-200/80">
        <p className="text-sm font-bold text-amber-950">
          見積もりの有効期限が切れています
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-800">
          内容を進めたい場合は、クリエイターへ新しい見積もりをご依頼ください。
        </p>
      </section>
    );
  }

  if (status === "cancelled") {
    return (
      <section className="rounded-[20px] bg-slate-100 px-5 py-5 ring-1 ring-slate-200/80">
        <p className="text-sm font-bold text-slate-950">
          この見積もりは取り消されています
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/70">
      <div>
        <p className="text-sm font-bold text-slate-950">
          この見積もりに回答する
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          見積もりを承認した後、次の画面から支払い方法の確認へ進めます。
        </p>

        {expiryText ? (
          <p className="mt-2 text-xs font-medium text-slate-400">
            回答期限：{expiryText}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            void decide("accepted")
          }
          disabled={Boolean(submitting)}
          className="h-12 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting === "accepted"
            ? "承認しています…"
            : "見積もりを承認する"}
        </button>

        <button
          type="button"
          onClick={() =>
            void decide("declined")
          }
          disabled={Boolean(submitting)}
          className="h-12 rounded-full bg-white px-5 text-sm font-bold text-slate-700 ring-1 ring-slate-300 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting === "declined"
            ? "保存しています…"
            : "今回は見送る"}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[14px] bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
