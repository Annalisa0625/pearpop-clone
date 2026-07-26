"use client";

import { useState } from "react";

type Props = {
  claim?: string | null;
  tokenHash?: string | null;
  initiallyInvalid?: boolean;
};

export default function QuoteAccessConfirmation({
  claim = null,
  tokenHash = null,
  initiallyInvalid = false,
}: Props) {
  const [invalid, setInvalid] = useState(initiallyInvalid || !claim || !tokenHash);
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const confirm = async () => {
    if (confirming || !claim || !tokenHash) return;
    setConfirming(true);
    try {
      const response = await fetch("/api/company/quote-access/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim, tokenHash }),
      });
      const body = await response.json() as {
        ok?: boolean;
        redirectTo?: string;
      };
      if (
        !response.ok ||
        !body.ok ||
        !body.redirectTo ||
        !/^\/b\/quotes\/[0-9a-f-]{36}$/.test(body.redirectTo)
      ) {
        setInvalid(true);
        return;
      }
      window.location.replace(body.redirectTo);
    } catch {
      setInvalid(true);
    } finally {
      setConfirming(false);
    }
  };

  const resend = async () => {
    if (resending || !claim) return;
    setResending(true);
    setResendMessage("");
    try {
      await fetch("/api/company/quote-access/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim }),
      });
      setResendMessage(
        "再送リクエストを受け付けました。届かない場合は60秒以上おいてからお試しください。"
      );
    } catch {
      setResendMessage("時間をおいてから、もう一度お試しください。");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-5 py-10">
      <section className="w-full max-w-md rounded-[24px] bg-white px-6 py-9 text-center shadow-sm ring-1 ring-slate-200/70">
        <p className="text-lg font-black tracking-tight text-slate-950">TrendMart</p>
        <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl">
          ✉
        </div>
        <h1 className="mt-6 text-[24px] font-bold tracking-[-0.03em] text-slate-950">
          見積もりが届いています
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          メールアドレスを確認すると、TrendMart内で見積もりを閲覧できます。
        </p>

        {!invalid ? (
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={confirming}
            className="mt-8 h-13 w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {confirming
              ? "メールアドレスを確認しています…"
              : "メールアドレスを確認して見積もりを見る"}
          </button>
        ) : (
          <div className="mt-8">
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              リンクが無効または期限切れです。通知メールを再送できます。
            </p>
            {claim ? (
              <button
                type="button"
                onClick={() => void resend()}
                disabled={resending}
                className="mt-4 h-13 w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {resending ? "再送しています…" : "確認メールを再送する"}
              </button>
            ) : null}
          </div>
        )}

        {resendMessage ? (
          <p className="mt-4 text-xs leading-6 text-slate-500" role="status">
            {resendMessage}
          </p>
        ) : null}
        <p className="mt-7 text-xs leading-6 text-slate-400">
          心当たりがない場合は、この画面を閉じてください。
        </p>
      </section>
    </main>
  );
}
