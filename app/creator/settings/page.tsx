"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppLocale } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function CreatorAccountSettingsPage() {
  const { locale } = useAppLocale();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const copy = locale === "ja"
    ? {
        title: "アカウント設定",
        description: "ログイン情報と本人情報を管理します。公開プロフィールとは別の設定です。",
        loginInfo: "ログイン情報",
        email: "メールアドレス",
        identity: "本人情報",
        identityBody: "本人確認・氏名・住所などの共通情報は、今後ここでまとめて管理します。",
        loading: "読み込み中…",
      }
    : {
        title: "Account settings",
        description: "Manage login and identity information separately from your public profile.",
        loginInfo: "Login information",
        email: "Email address",
        identity: "Identity information",
        identityBody: "Verification, legal name, address, and other shared information will be managed here.",
        loading: "Loading…",
      };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/login?next=/creator/settings");
        return;
      }
      if (!cancelled) {
        setEmail(user.email ?? null);
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <div className="mx-auto w-full max-w-3xl pb-6 pt-3">
      <section className="px-1 pb-6 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff4765]">Account</p>
        <h1 className="mt-2 text-[32px] font-bold tracking-[-0.055em] text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-500">{copy.description}</p>
      </section>

      <section className="overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200/80 px-5 py-5">
          <p className="text-sm font-bold text-slate-950">{copy.loginInfo}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{copy.email}</p>
          <p className="mt-1 break-all text-[15px] font-semibold text-slate-800">{loading ? copy.loading : email ?? "-"}</p>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm font-bold text-slate-950">{copy.identity}</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{copy.identityBody}</p>
        </div>
      </section>
    </div>
  );
}
