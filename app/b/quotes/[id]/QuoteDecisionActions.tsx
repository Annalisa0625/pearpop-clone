"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QuoteStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

type QuoteDecision = "accepted" | "declined";
type CheckoutReturn = "success" | "cancelled" | null;
type ReconcileState = "idle" | "checking" | "verified" | "incomplete" | "error";
type OrderSummary = {
  id: string;
  status: string;
  paymentStatus: string;
};

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
  initialCheckoutStatus,
  checkoutReturn,
  canReconcileSuccess,
  initialOrder,
}: {
  quoteId: string;
  initialStatus: QuoteStatus;
  validUntil: string;
  initialCheckoutStatus: string;
  checkoutReturn: CheckoutReturn;
  canReconcileSuccess: boolean;
  initialOrder: OrderSummary | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<QuoteStatus>(() =>
    effectiveStatus(initialStatus, validUntil)
  );

  const [submitting, setSubmitting] =
    useState<QuoteDecision | null>(null);

  const [checkoutSubmitting, setCheckoutSubmitting] =
    useState(false);

  const [checkoutStatus, setCheckoutStatus] =
    useState(initialCheckoutStatus);

  const [reconcileState, setReconcileState] =
    useState<ReconcileState>("idle");

  const reconcileStartedRef = useRef(false);
  const orderRefreshCountRef = useRef(0);

  const [error, setError] = useState("");

  useEffect(() => {
    setCheckoutStatus(initialCheckoutStatus);
  }, [initialCheckoutStatus]);

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

  const reconcileCheckout = useCallback(async () => {
    if (!canReconcileSuccess || initialOrder) return;

    setReconcileState("checking");
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

      const body = (await response.json()) as CheckoutResponse;

      if (!response.ok || !body.ok) {
        const message = body.ok
          ? "Checkoutの状態を確認できませんでした。"
          : body.error;
        const alreadyProcessed =
          response.status === 409 &&
          (message.includes("正式注文") || message.includes("すでに完了"));

        if (alreadyProcessed) {
          setCheckoutStatus("completed");
          setReconcileState("verified");
          router.refresh();
          return;
        }

        throw new Error(message);
      }

      if (body.completed) {
        setCheckoutStatus("completed");
        setReconcileState("verified");
        router.refresh();
        return;
      }

      // A success query is only a return signal. If Stripe still reports an
      // open session, keep the user on this page and offer the existing session
      // again instead of claiming that an order was created.
      setCheckoutStatus("open");
      setReconcileState("incomplete");
    } catch (cause) {
      setReconcileState("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Checkoutの状態を確認できませんでした。時間を置いてもう一度お試しください。"
      );
    }
  }, [canReconcileSuccess, initialOrder, quoteId, router]);

  useEffect(() => {
    if (
      checkoutReturn !== "success" ||
      initialOrder ||
      checkoutStatus === "completed" ||
      !canReconcileSuccess ||
      reconcileStartedRef.current
    ) {
      return;
    }

    reconcileStartedRef.current = true;
    void reconcileCheckout();
  }, [
    canReconcileSuccess,
    checkoutReturn,
    checkoutStatus,
    initialOrder,
    reconcileCheckout,
  ]);

  useEffect(() => {
    if (initialOrder || checkoutStatus !== "completed") return;

    orderRefreshCountRef.current = 0;
    const timer = window.setInterval(() => {
      orderRefreshCountRef.current += 1;
      router.refresh();
      if (orderRefreshCountRef.current >= 6) {
        window.clearInterval(timer);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [checkoutStatus, initialOrder, router]);

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
        const message = body.ok ? "決済画面を開けませんでした。" : body.error;
        const alreadyProcessed =
          response.status === 409 &&
          (message.includes("正式注文") || message.includes("すでに完了"));
        if (alreadyProcessed) {
          setCheckoutStatus("completed");
          router.refresh();
          return;
        }
        throw new Error(message);
      }

      if (body.completed) {
        setCheckoutStatus("completed");
        setReconcileState("verified");
        if (body.redirectTo) {
          window.location.replace(body.redirectTo);
        } else {
          router.refresh();
        }
        return;
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

  if (initialOrder) {
    const waitingForCreator = initialOrder.status === "authorized_pending_creator";
    const checkingPayment = initialOrder.status === "checkout_pending";
    const orderStarted =
      initialOrder.paymentStatus === "captured" ||
      ["accepted_captured", "in_progress"].includes(initialOrder.status);
    const title = waitingForCreator
      ? "Creatorの承認を待っています"
      : checkingPayment
        ? "支払い方法を確認しています"
        : orderStarted
          ? "取引が開始されています"
          : "正式注文が作成されています";
    const description = waitingForCreator
      ? "支払い方法の確認と正式注文の作成が完了しています。Creatorが承認すると取引が開始され、チャットが利用できるようになります。"
      : checkingPayment
        ? "正式注文は作成済みです。確認が完了するとCreatorの承認待ちに進みます。Checkoutをやり直す必要はありません。"
        : orderStarted
          ? "Creatorの承認後、取引が開始されました。注文詳細でチャットや進行状況を確認できます。"
          : "現在の状況と次に必要な対応は、注文詳細で確認できます。";

    return (
      <section className="rounded-[22px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200/70">
        {checkoutReturn === "success" ? (
          <p className="mb-3 rounded-[14px] bg-white/75 px-4 py-3 text-xs font-medium leading-5 text-emerald-800 ring-1 ring-emerald-200/70">
            支払い方法の確認が完了しました。正式注文の現在の状態を表示しています。
          </p>
        ) : null}
        <p className="text-sm font-bold text-emerald-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">{description}</p>
        <a
          href={`/b/orders/${initialOrder.id}`}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          注文詳細を見る
        </a>
      </section>
    );
  }

  if (checkoutStatus === "completed" || reconcileState === "verified") {
    return (
      <section className="rounded-[22px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200/70">
        <p className="text-sm font-bold text-emerald-950">
          支払い方法の確認が完了しました
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          正式注文を準備しています。Checkoutをやり直す必要はありません。注文が生成されると、Creatorの承認待ちに進みます。
        </p>
        <div className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          注文の準備状況を確認しています…
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 min-h-11 w-full text-xs font-semibold text-emerald-800 underline underline-offset-4"
        >
          状態を再確認する
        </button>
      </section>
    );
  }

  if (reconcileState === "checking") {
    return (
      <section className="rounded-[22px] bg-slate-50 px-5 py-5 ring-1 ring-slate-200/80" aria-busy="true">
        <p className="text-sm font-bold text-slate-950">Checkoutの状態を確認しています</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Stripeでの手続きと正式注文の準備状況を照合しています。このまま少しお待ちください。
        </p>
      </section>
    );
  }

  if (status === "accepted") {
    const checkoutWasCancelled = checkoutReturn === "cancelled";
    const successCouldNotBeVerified =
      checkoutReturn === "success" &&
      (!canReconcileSuccess ||
        reconcileState === "incomplete" ||
        reconcileState === "error");
    const resumingCheckout =
      checkoutWasCancelled ||
      checkoutStatus === "open" ||
      reconcileState === "incomplete" ||
      reconcileState === "error";

    return (
      <section className="rounded-[22px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200/70">
        {checkoutWasCancelled ? (
          <div className="mb-4 rounded-[14px] bg-amber-50 px-4 py-3 ring-1 ring-amber-200/80">
            <p className="text-sm font-bold text-amber-950">
              支払い手続きは完了していません
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Stripe Checkoutをキャンセルして戻りました。見積もりの承認状態は保持されているため、準備ができたら支払い方法の確認を再開できます。
            </p>
          </div>
        ) : successCouldNotBeVerified ? (
          <div className="mb-4 rounded-[14px] bg-amber-50 px-4 py-3 ring-1 ring-amber-200/80">
            <p className="text-sm font-bold text-amber-950">
              Checkoutの完了をまだ確認できません
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              URLだけでは注文作成済みと判断していません。現在のCheckout状態を確認し、必要な場合だけ手続きを再開してください。
            </p>
          </div>
        ) : null}

        <p className="text-sm font-bold text-emerald-950">
          {checkoutWasCancelled
            ? "見積もりは承認済みです"
            : "見積もりを承認しました"}
        </p>

        <p className="mt-2 text-sm leading-6 text-emerald-800">
          支払い方法の確認後に正式注文が作成され、Creatorの承認待ちに進みます。Creatorが承認すると取引が開始されます。
        </p>

        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={checkoutSubmitting}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkoutSubmitting
            ? "決済画面を準備しています…"
            : resumingCheckout
              ? "支払い方法の確認を再開する"
              : "支払い方法の確認へ進む"}
        </button>

        <p className="mt-3 text-xs leading-5 text-emerald-700">
          Checkout完了時点ではCreatorへの支払いは確定しません。Creator承認後に取引が開始されます。
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
