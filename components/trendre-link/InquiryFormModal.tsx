"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  buildInquiryReturnPath,
  createInquiryDraft,
  createInquirySubmissionId,
  inquiryDraftStorageKey,
  parseInquiryDraft,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
  type CreatorLinkInquiryFormState,
} from "@/lib/trendre-link/inquiry-return";

import {
  CAMPAIGN_GOALS,
  COMPANY_SOCIAL_PLATFORMS,
  FREE_OFFER_OPTIONS,
  MEETING_METHODS,
  PLATFORM_DELIVERABLES,
  PR_PROJECT_TYPES,
  REQUESTED_PLATFORMS,
  UGC_DELIVERABLE_TYPES,
  UGC_USAGE_PURPOSES,
  type CreatorLinkInquiryFormKind,
  type CreatorLinkRequestMode,
  type PlatformDeliverable,
} from "@/lib/trendre-link/inquiry-forms";

type Props = {
  kind: CreatorLinkInquiryFormKind;
  title: string;
  slug: string;
  formId: string | null;
  mode: "public" | "preview";
  locale: "ja" | "en";
  onClose: () => void;
};

type FormState = CreatorLinkInquiryFormState;

const initialState: FormState = {
  request_mode: "",
  project_type: "",
  requested_platforms: [],
  other_platform: "",
  deliverables_by_platform: {},
  ugc_deliverable_types: [],
  ugc_other_deliverable: "",
  deliverable_count: 1,
  usage_purposes: [],
  usage_other: "",
  meeting_method: "",
  product_name: "",
  product_url: "",
  desired_timing: "",
  budget_text: "",
  campaign_goal: "",
  campaign_goal_other: "",
  has_free_offer: "",
  free_offer_item: "",
  free_offer_quantity: "",
  free_offer_frequency: "",
  free_offer_people: "",
  free_offer_conditions: "",
  company_name: "",
  contact_name: "",
  contact_email: "",
  company_website: "",
  company_social_accounts: {},
  selling_points: "",
  reference_url: "",
  additional_notes: "",
  consents: [false, false, false, false, false, false],
  subject: "",
  message: "",
  website: "",
};

const labels: Record<string, string> = {
  visit_experience: "来店・体験",
  product_delivery: "商品提供",
  provided_assets: "素材提供",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  other: "その他",
  photo_image: "写真・画像素材",
  video: "動画素材",
  paid_ads: "広告で使用",
  owned_social: "自社SNSへ掲載",
  website_lp_ec: "自社Webサイト・LP・ECサイトへ掲載",
  digital_signage: "デジタルサイネージ・看板へ掲載",
  chat: "チャットで相談したい",
  in_person: "対面で打ち合わせたい",
  online: "Teams・Zoomなどでオンライン打ち合わせをしたい",
  not_needed: "打ち合わせは必要ない",
  awareness: "認知を広げたい",
  product_launch: "新商品を知ってほしい",
  sales: "購入につなげたい",
  store_visit: "来店を増やしたい",
  content_asset: "広告素材がほしい",
  feed_post: "フィード投稿",
  reel: "リール",
  stories: "ストーリーズ",
  live_stream: "ライブ配信",
  short_video: "ショート動画",
  standard_post: "通常投稿",
  thread_post: "スレッド投稿",
  video_post: "動画投稿",
  long_video: "長尺動画",
};

const socialAssets: Record<string, string> = {
  instagram: "/brand/social/instagram.png",
  tiktok: "/brand/social/tiktok.png",
  x: "/brand/social/x.png",
  youtube: "/brand/social/youtube.png",
};
const socialPrefixes: Record<string, string> = {
  instagram: "instagram.com/",
  tiktok: "tiktok.com/@",
  x: "x.com/",
  youtube: "youtube.com/@",
};

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span className="text-[13px] font-semibold text-slate-900">{children} <span className={required ? "text-rose-500" : "text-slate-400"}>{required ? "必須" : "任意"}</span></span>;
}

const inputClass = "mt-2 h-12 w-full rounded-[14px] bg-slate-50 px-4 text-[14px] text-slate-950 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-950/20";
const textareaClass = "mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-950 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-950/20";

function Choice({ checked, children, onClick, description }: { checked: boolean; children: React.ReactNode; onClick: () => void; description?: string }) {
  return (
    <button type="button" aria-pressed={checked} onClick={onClick} className={`w-full rounded-[14px] px-4 py-3 text-left ring-1 transition ${checked ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-800 ring-slate-200"}`}>
      <span className="block text-[14px] font-semibold">{children}</span>
      {description ? <span className={`mt-1 block text-[12px] leading-5 ${checked ? "text-white/65" : "text-slate-500"}`}>{description}</span> : null}
    </button>
  );
}

function CountInput({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const set = (raw: string | number) => {
    const nextValue = Number(raw);
    if (!Number.isSafeInteger(nextValue) || nextValue < 1) return false;
    onChange(nextValue);
    return true;
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-slate-900">{label}</p>
      <div className="flex h-12 items-center gap-2 rounded-[14px] bg-slate-50 px-2 ring-1 ring-slate-200">
        <button type="button" aria-label={`${label}を減らす`} onClick={() => onChange(Math.max(1, value - 1))} className="h-9 w-9 shrink-0 rounded-full bg-white text-xl font-semibold text-slate-800 shadow-sm ring-1 ring-slate-300 transition active:scale-90">−</button>
        <label className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <span className="sr-only">{label}の制作数</span>
          <input
            aria-label={`${label}の制作数`}
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(event) => {
              if (!set(event.target.value)) event.currentTarget.value = String(value);
            }}
            className="w-[4ch] bg-transparent text-right text-[16px] font-semibold text-slate-950 outline-none"
          />
          <span aria-hidden="true" className="text-[14px] font-semibold text-slate-700">件</span>
        </label>
        <button type="button" aria-label={`${label}を増やす`} onClick={() => set(value + 1)} className="h-9 w-9 shrink-0 rounded-full bg-slate-950 text-xl font-semibold text-white shadow-sm transition active:scale-90">＋</button>
      </div>
    </div>
  );
}

export default function InquiryFormModal({ kind, title, slug, formId, mode, onClose }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  useEffect(() => {
    if (mode !== "public" || typeof window === "undefined") return;
    if (!formId) return;
    const key = inquiryDraftStorageKey(slug);
    const stored = safeSessionStorageGet(key);
    const draft = parseInquiryDraft(
      stored,
      { slug, formId, kind }
    );
    if (!draft) {
      if (stored) safeSessionStorageRemove(key);
      setSubmissionId(createInquirySubmissionId() ?? "");
      return;
    }
    setForm(draft.form);
    setStep(draft.step);
    setSubmissionId(draft.submissionId);
  }, [formId, kind, mode, slug]);

  const ensureSubmissionId = () => {
    if (submissionId) return submissionId;
    const created = createInquirySubmissionId();
    if (created) setSubmissionId(created);
    return created;
  };

  const saveDraftAndContinueToAuth = () => {
    if (!formId) return false;
    const activeSubmissionId = ensureSubmissionId();
    if (!activeSubmissionId) {
      setError("安全な送信IDを作成できませんでした。ブラウザを更新してもう一度お試しください。");
      return false;
    }
    const returnPath = buildInquiryReturnPath(slug);
    const saved = safeSessionStorageSet(
      inquiryDraftStorageKey(slug),
      JSON.stringify(createInquiryDraft({
        slug,
        formId,
        submissionId: activeSubmissionId,
        kind,
        title,
        form,
        step,
      }))
    );
    if (!saved) {
      setError("入力内容をブラウザへ安全に保存できませんでした。ストレージ設定を確認してください。");
      return false;
    }
    router.push(`/signup/company?next=${encodeURIComponent(returnPath)}`);
    return true;
  };
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "requested_platforms" | "ugc_deliverable_types" | "usage_purposes", value: string) =>
    update(key, form[key].includes(value) ? form[key].filter((item) => item !== value) : [...form[key], value]);

  const togglePlatform = (platform: string) => {
    const removing = form.requested_platforms.includes(platform);
    update("requested_platforms", removing ? form.requested_platforms.filter((value) => value !== platform) : [...form.requested_platforms, platform]);
    if (removing) {
      const next = { ...form.deliverables_by_platform };
      delete next[platform];
      update("deliverables_by_platform", next);
    }
  };

  const toggleDeliverable = (platform: string, type: string) => {
    const existing = form.deliverables_by_platform[platform] ?? [];
    const nextItems = existing.some((item) => item.type === type)
      ? existing.filter((item) => item.type !== type)
      : [...existing, { type, count: 1, other_text: null }];
    update("deliverables_by_platform", { ...form.deliverables_by_platform, [platform]: nextItems });
  };

  const updateDeliverable = (platform: string, type: string, patch: Partial<PlatformDeliverable>) => {
    update("deliverables_by_platform", {
      ...form.deliverables_by_platform,
      [platform]: (form.deliverables_by_platform[platform] ?? []).map((item) => item.type === type ? { ...item, ...patch } : item),
    });
  };

  const validOptionalUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };

  const validate = () => {
    if (kind === "simple") {
      if (!form.contact_name.trim() || !form.contact_email.trim() || !form.message.trim()) return "必須項目を入力してください。";
      return "";
    }
    if (step === 0 && !form.request_mode) return "依頼形式を選択してください。";
    if (step === 1) {
      if (form.request_mode === "ugc" && !form.ugc_deliverable_types.length) return "希望する制作物を選択してください。";
      if (form.request_mode === "ugc" && form.ugc_deliverable_types.includes("other") && !form.ugc_other_deliverable.trim()) return "その他の制作物を入力してください。";
      if (form.request_mode === "pr_post" && !form.project_type) return "案件タイプを選択してください。";
    }
    if (step === 2 && form.request_mode === "ugc") {
      if (!form.usage_purposes.length || !form.meeting_method) return "利用用途と打ち合わせ方法を選択してください。";
      if (form.usage_purposes.includes("other") && !form.usage_other.trim()) return "その他の利用用途を入力してください。";
    }
    if (step === 2 && form.request_mode === "pr_post") {
      if (!form.requested_platforms.length) return "希望するSNSを選択してください。";
      if (form.requested_platforms.includes("other") && !form.other_platform.trim()) return "その他のSNSを入力してください。";
      for (const platform of form.requested_platforms) {
        const items = form.deliverables_by_platform[platform] ?? [];
        if (!items.length) return `${labels[platform] ?? platform}の制作物を選択してください。`;
        if (items.some((item) => item.type === "other" && !item.other_text?.trim())) return `${labels[platform] ?? platform}のその他の制作物を入力してください。`;
      }
    }
    if (step === 3) {
      if (!form.product_name.trim() || !form.desired_timing.trim() || !/^[1-9]\d*$/.test(form.budget_text)) return "商品・希望時期・正の整数の予算を入力してください。";
      if (!validOptionalUrl(form.product_url)) return "商品・サービスURLを正しく入力してください。";
      if (form.request_mode === "pr_post" && !form.campaign_goal) return "今回の目的を選択してください。";
      if (form.campaign_goal === "other" && !form.campaign_goal_other.trim()) return "その他の目的を入力してください。";
      if (!form.has_free_offer) return "無償提供の有無を選択してください。";
      if (form.has_free_offer === "provided" && !form.free_offer_item.trim()) return "提供する商品・サービスを入力してください。";
    }
    if (step === 4) {
      if (!form.company_name.trim() || !form.contact_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) return "企業情報と正しいメールアドレスを入力してください。";
      if (!validOptionalUrl(form.company_website)) return "自社WebサイトのURLを正しく入力してください。";
      if (Object.values(form.company_social_accounts).some((username) => !username.trim())) return "選択した自社SNSのユーザーネームを入力してください。";
    }
    if (step === 5 && !validOptionalUrl(form.reference_url)) return "参考URLを正しく入力してください。";
    if (step === 5 && form.consents.some((value) => !value)) return "すべての確認事項への同意が必要です。";
    return "";
  };

  const canAdvance = (() => {
    if (submitting) return false;
    if (kind === "simple") {
      return Boolean(
        form.contact_name.trim() &&
        form.contact_email.trim() &&
        form.message.trim()
      );
    }
    if (step === 0) return Boolean(form.request_mode);
    if (step === 1) {
      return form.request_mode === "ugc"
        ? form.ugc_deliverable_types.length > 0 &&
            (!form.ugc_deliverable_types.includes("other") ||
              Boolean(form.ugc_other_deliverable.trim()))
        : Boolean(form.project_type);
    }
    if (step === 2 && form.request_mode === "ugc") {
      return (
        form.usage_purposes.length > 0 &&
        Boolean(form.meeting_method) &&
        (!form.usage_purposes.includes("other") || Boolean(form.usage_other.trim()))
      );
    }
    if (step === 2 && form.request_mode === "pr_post") {
      return (
        form.requested_platforms.length > 0 &&
        (!form.requested_platforms.includes("other") || Boolean(form.other_platform.trim())) &&
        form.requested_platforms.every((platform) => {
          const items = form.deliverables_by_platform[platform] ?? [];
          return (
            items.length > 0 &&
            items.every(
              (item) => item.type !== "other" || Boolean(item.other_text?.trim())
            )
          );
        })
      );
    }
    if (step === 3) {
      return Boolean(
        form.product_name.trim() &&
        form.desired_timing.trim() &&
        /^[1-9]\d*$/.test(form.budget_text) &&
        form.has_free_offer &&
        (form.has_free_offer !== "provided" || form.free_offer_item.trim()) &&
        (form.request_mode !== "pr_post" ||
          (form.campaign_goal &&
            (form.campaign_goal !== "other" || form.campaign_goal_other.trim())))
      );
    }
    if (step === 4) {
      return Boolean(
        form.company_name.trim() &&
        form.contact_name.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email) &&
        Object.values(form.company_social_accounts).every((username) =>
          Boolean(username.trim())
        )
      );
    }
    if (step === 5) return form.consents.every(Boolean);
    return true;
  })();

  const next = () => {
    const message = validate();
    if (message) return setError(message);
    setError("");
    setStep((current) => Math.min(5, current + 1));
  };

  const submit = async () => {
    const message = validate();
    if (message) return setError(message);
    if (mode === "preview") return setError("送信は公開ページで行えます。");
    if (!formId) return setError("フォームを確認できませんでした。");
    const activeSubmissionId = ensureSubmissionId();
    if (!activeSubmissionId) {
      return setError("安全な送信IDを作成できませんでした。ブラウザを更新してもう一度お試しください。");
    }
    setSubmitting(true);
    setError("");
    try {
      if (kind === "pr") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          saveDraftAndContinueToAuth();
          return;
        }
      }

      const response = await fetch("/api/public/creator-link/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          formId,
          submissionId: activeSubmissionId,
          formKind: kind,
          ...form,
        }),
      });
      const body = await response.json();
      if (response.status === 401 && kind === "pr") {
        saveDraftAndContinueToAuth();
        return;
      }
      if (!response.ok || !body.ok) throw new Error(body.error || "送信できませんでした。");
      safeSessionStorageRemove(inquiryDraftStorageKey(slug));
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  };

  const consentLabels = [
    "入力した商品・サービス情報が正確であることを確認しました",
    "実際に体験していない感想や、根拠のない効果表現を求めません",
    "特定の高評価や好意的な感想を強制しません",
    "TrendMart利用規約とプライバシーポリシーに同意します",
    "見積もりが届いた場合、登録したTrendMartアカウントで内容を確認することに同意します",
    "本案件の契約・連絡・支払いをTrendMart上で行うことに同意します",
  ];

  const offerFields = form.has_free_offer === "provided" ? (
    <div className="space-y-4 border-l-2 border-slate-200 pl-4">
      <label className="block"><FieldLabel required>提供する商品・サービス</FieldLabel><input value={form.free_offer_item} maxLength={200} onChange={(e) => update("free_offer_item", e.target.value)} className={inputClass} /></label>
      {[["free_offer_quantity", "数量"], ["free_offer_frequency", "提供回数"], ["free_offer_people", "対象人数"]].map(([key, label]) => <label key={key} className="block"><FieldLabel>{label}</FieldLabel><input value={form[key as keyof FormState] as string} maxLength={80} onChange={(e) => update(key as keyof FormState, e.target.value as never)} className={inputClass} /></label>)}
      <label className="block"><FieldLabel>利用範囲・提供条件</FieldLabel><textarea rows={3} value={form.free_offer_conditions} maxLength={1000} onChange={(e) => update("free_offer_conditions", e.target.value)} className={textareaClass} /></label>
    </div>
  ) : null;

  const renderStep = () => {
    if (kind === "simple") return (
      <div className="space-y-4">
        <label className="block"><FieldLabel required>お名前</FieldLabel><input value={form.contact_name} maxLength={80} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>メールアドレス</FieldLabel><input type="email" value={form.contact_email} maxLength={254} onChange={(e) => update("contact_email", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel>件名</FieldLabel><input value={form.subject} maxLength={120} onChange={(e) => update("subject", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>お問い合わせ内容</FieldLabel><textarea rows={6} value={form.message} maxLength={3000} onChange={(e) => update("message", e.target.value)} className={textareaClass} /></label>
      </div>
    );
    if (step === 0) return (
      <fieldset className="space-y-3">
        <legend className="mb-3 text-[18px] font-semibold text-slate-950">依頼内容を選択</legend>
        <Choice checked={form.request_mode === "pr_post"} onClick={() => update("request_mode", "pr_post")} description="インフルエンサー自身のSNSアカウントから投稿">PR投稿</Choice>
        <Choice checked={form.request_mode === "ugc"} onClick={() => update("request_mode", "ugc")} description="写真・画像・動画素材を制作して納品。インフルエンサー自身のSNSへの投稿はありません">UGC制作</Choice>
      </fieldset>
    );
    if (step === 1 && form.request_mode === "ugc") return (
      <div className="space-y-5">
        <fieldset><legend><FieldLabel required>希望する制作物（複数選択可）</FieldLabel></legend><div className="mt-3 grid gap-2">{UGC_DELIVERABLE_TYPES.map((value) => <Choice key={value} checked={form.ugc_deliverable_types.includes(value)} onClick={() => toggle("ugc_deliverable_types", value)}>{labels[value]}</Choice>)}</div></fieldset>
        {form.ugc_deliverable_types.includes("other") ? <label className="block"><FieldLabel required>その他の制作物</FieldLabel><input value={form.ugc_other_deliverable} maxLength={200} onChange={(e) => update("ugc_other_deliverable", e.target.value)} className={inputClass} /></label> : null}
        <CountInput value={form.deliverable_count} onChange={(value) => update("deliverable_count", value)} label="制作数" />
      </div>
    );
    if (step === 1) return (
      <fieldset><legend><FieldLabel required>案件タイプ</FieldLabel></legend><div className="mt-3 space-y-2">{PR_PROJECT_TYPES.map((value) => <Choice key={value} checked={form.project_type === value} onClick={() => update("project_type", value)} description={value === "visit_experience" ? "店舗やサービスを体験して投稿" : value === "product_delivery" ? "商品を提供して、使用・撮影・投稿" : "企業が提供した画像素材を使用して投稿"}>{labels[value]}</Choice>)}</div></fieldset>
    );
    if (step === 2 && form.request_mode === "ugc") return (
      <div className="space-y-6">
        <fieldset><legend><FieldLabel required>どのような用途ですか？（複数選択可）</FieldLabel></legend><div className="mt-3 space-y-2">{UGC_USAGE_PURPOSES.map((value) => <Choice key={value} checked={form.usage_purposes.includes(value)} onClick={() => toggle("usage_purposes", value)} description={value === "paid_ads" ? "Meta広告、Google広告、YouTube広告など" : undefined}>{labels[value]}</Choice>)}</div></fieldset>
        {form.usage_purposes.includes("other") ? <label className="block"><FieldLabel required>その他の利用用途</FieldLabel><input value={form.usage_other} maxLength={200} onChange={(e) => update("usage_other", e.target.value)} className={inputClass} /></label> : null}
        <fieldset><legend><FieldLabel required>打ち合わせは必要ですか？</FieldLabel></legend><div className="mt-3 space-y-2">{MEETING_METHODS.map((value) => <Choice key={value} checked={form.meeting_method === value} onClick={() => update("meeting_method", value)}>{labels[value]}</Choice>)}</div></fieldset>
      </div>
    );
    if (step === 2) return (
      <div className="space-y-6">
        <fieldset><legend><FieldLabel required>希望するSNS（複数選択可）</FieldLabel></legend><div className="mt-3 flex flex-wrap gap-2">{REQUESTED_PLATFORMS.map((value) => <button key={value} type="button" aria-pressed={form.requested_platforms.includes(value)} onClick={() => togglePlatform(value)} className={`rounded-full px-4 py-2 text-[13px] font-semibold ring-1 ${form.requested_platforms.includes(value) ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-700 ring-slate-200"}`}>{labels[value]}</button>)}</div></fieldset>
        {form.requested_platforms.includes("other") ? <label className="block"><FieldLabel required>その他のSNS</FieldLabel><input value={form.other_platform} maxLength={100} onChange={(e) => update("other_platform", e.target.value)} className={inputClass} /></label> : null}
        {form.requested_platforms.map((platform) => <fieldset key={platform} className="border-t border-slate-100 pt-5"><legend className="text-[15px] font-semibold text-slate-950">{labels[platform] ?? form.other_platform}</legend><div className="mt-3 space-y-3">{PLATFORM_DELIVERABLES[platform as keyof typeof PLATFORM_DELIVERABLES].map((type) => {
          const item = (form.deliverables_by_platform[platform] ?? []).find((entry) => entry.type === type);
          return <div key={type}><Choice checked={Boolean(item)} onClick={() => toggleDeliverable(platform, type)}>{labels[type]}</Choice>{item ? <div className="mt-3 pl-4"><CountInput label={labels[type]} value={item.count} onChange={(count) => updateDeliverable(platform, type, { count })} />{type === "other" ? <input aria-label="その他の制作物" value={item.other_text ?? ""} maxLength={200} placeholder="制作物を入力" onChange={(e) => updateDeliverable(platform, type, { other_text: e.target.value })} className={inputClass} /> : null}</div> : null}</div>;
        })}</div></fieldset>)}
      </div>
    );
    if (step === 3) return (
      <div className="space-y-5">
        <label className="block"><FieldLabel required>商品・サービス名</FieldLabel><input value={form.product_name} maxLength={200} onChange={(e) => update("product_name", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel>商品・サービスURL</FieldLabel><input type="url" value={form.product_url} maxLength={500} placeholder="https://" onChange={(e) => update("product_url", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>希望時期</FieldLabel><input value={form.desired_timing} maxLength={120} placeholder="2026年9月中 / 商品到着後2週間以内" onChange={(e) => update("desired_timing", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>予算目安（円）</FieldLabel><input inputMode="numeric" value={form.budget_text} maxLength={12} onChange={(e) => update("budget_text", e.target.value.replace(/\D/g, ""))} className={inputClass} /></label>
        {form.request_mode === "pr_post" ? <fieldset><legend><FieldLabel required>今回の目的</FieldLabel></legend><div className="mt-3 grid gap-2">{CAMPAIGN_GOALS.map((value) => <Choice key={value} checked={form.campaign_goal === value} onClick={() => update("campaign_goal", value)}>{labels[value]}</Choice>)}</div>{form.campaign_goal === "other" ? <input aria-label="その他の目的" value={form.campaign_goal_other} maxLength={200} onChange={(e) => update("campaign_goal_other", e.target.value)} className={inputClass} /> : null}</fieldset> : null}
        <fieldset><legend><FieldLabel required>商品・サービスの無償提供</FieldLabel></legend><div className="mt-3 grid gap-2">{FREE_OFFER_OPTIONS.map((value) => <Choice key={value} checked={form.has_free_offer === value} onClick={() => update("has_free_offer", value)}>{value === "provided" ? "商品・サービスを提供する" : "提供なし"}</Choice>)}</div></fieldset>
        {offerFields}
      </div>
    );
    if (step === 4) return (
      <div className="space-y-5">
        <label className="block"><FieldLabel required>会社名・ブランド名</FieldLabel><input value={form.company_name} maxLength={120} onChange={(e) => update("company_name", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>担当者名</FieldLabel><input value={form.contact_name} maxLength={80} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel required>メールアドレス</FieldLabel><input type="email" value={form.contact_email} maxLength={254} onChange={(e) => update("contact_email", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel>自社Webサイト</FieldLabel><input type="url" value={form.company_website} maxLength={500} placeholder="https://" onChange={(e) => update("company_website", e.target.value)} className={inputClass} /></label>
        <fieldset><legend><FieldLabel>自社SNS（複数登録可）</FieldLabel></legend><div className="mt-3 grid grid-cols-2 gap-2">{COMPANY_SOCIAL_PLATFORMS.map((platform) => {
          const selected = Object.hasOwn(form.company_social_accounts, platform);
          return <button key={platform} type="button" aria-pressed={selected} onClick={() => { const next = { ...form.company_social_accounts }; if (selected) delete next[platform]; else next[platform] = ""; update("company_social_accounts", next); }} className={`flex items-center gap-2 rounded-[14px] px-3 py-3 text-left text-[13px] font-semibold ring-1 ${selected ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-700 ring-slate-200"}`}><Image src={socialAssets[platform]} alt="" width={22} height={22} className="rounded-md" />{labels[platform]}</button>;
        })}</div></fieldset>
        {COMPANY_SOCIAL_PLATFORMS.filter((platform) => Object.hasOwn(form.company_social_accounts, platform)).map((platform) => <label key={platform} className="block"><FieldLabel required>{labels[platform]} ユーザーネーム</FieldLabel><div className="mt-2 flex h-12 overflow-hidden rounded-[14px] bg-slate-50 ring-1 ring-slate-200"><span className="flex items-center border-r border-slate-200 px-3 text-[12px] text-slate-500">{socialPrefixes[platform]}</span><input value={form.company_social_accounts[platform]} maxLength={100} onChange={(e) => update("company_social_accounts", { ...form.company_social_accounts, [platform]: e.target.value.replace(/^@/, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-slate-950 outline-none" /></div></label>)}
      </div>
    );
    return (
      <div className="space-y-5">
        {form.request_mode === "pr_post" ? <p className="rounded-[14px] bg-amber-50 px-4 py-3 text-[12px] leading-6 text-amber-900">企業からの依頼または商品提供を受けた投稿であることを、投稿内で明確に表示する前提です。</p> : null}
        <label className="block"><FieldLabel>特徴・アピールポイント</FieldLabel><textarea rows={4} value={form.selling_points} maxLength={2000} placeholder="商品の客観的な特徴、紹介したい機能、ブランドとして大切にしていること、撮影時の注意点" onChange={(e) => update("selling_points", e.target.value)} className={textareaClass} /></label>
        <label className="block"><FieldLabel>参考URL</FieldLabel><input type="url" value={form.reference_url} maxLength={500} placeholder="参考広告、参考動画、ブランド資料、商品ページ" onChange={(e) => update("reference_url", e.target.value)} className={inputClass} /></label>
        <label className="block"><FieldLabel>その他の補足</FieldLabel><textarea rows={4} value={form.additional_notes} maxLength={3000} placeholder="納品形式、縦横比、データサイズ、希望する修正回数、事前共有事項" onChange={(e) => update("additional_notes", e.target.value)} className={textareaClass} /></label>
        <fieldset><legend className="text-[15px] font-semibold text-slate-950">送信前の確認</legend><div className="mt-3 space-y-3">{consentLabels.map((label, index) => <label key={label} className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-slate-50 px-3 py-3 text-[12px] leading-5 text-slate-700"><input type="checkbox" checked={form.consents[index]} onChange={(e) => { const next = [...form.consents]; next[index] = e.target.checked; update("consents", next); }} className="mt-0.5 h-4 w-4 accent-slate-950" /><span>{index === 3 ? <>TrendMart<Link href="/terms" target="_blank" className="underline">利用規約</Link>と<Link href="/privacy" target="_blank" className="underline">プライバシーポリシー</Link>に同意します</> : label}</span></label>)}</div></fieldset>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px]">
      <button type="button" aria-label="フォームを閉じる" onClick={onClose} className="absolute inset-0" />
      <section role="dialog" aria-modal="true" aria-label={title} className="relative z-10 flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-[26px] bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
          <div className="mt-3 flex items-center justify-between gap-3"><div><h2 className="text-[18px] font-semibold text-slate-950">{kind === "pr" ? "見積もりを依頼" : title}</h2>{kind === "pr" && step > 0 ? <p className="mt-1 text-[11px] text-slate-500">{form.request_mode === "pr_post" ? "PR投稿" : "UGC制作"}・{step}/5</p> : null}</div><button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-semibold leading-none text-white shadow-sm ring-1 ring-slate-950 transition hover:bg-slate-800 active:scale-90" aria-label="閉じる">×</button></div>
          {kind === "pr" && step > 0 ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-950 transition-all" style={{ width: `${step * 20}%` }} /></div> : null}
        </header>
        {submitted ? <div className="flex-1 px-6 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div><h3 className="mt-5 text-xl font-semibold text-slate-950">見積もり依頼を受け付けました</h3><p className="mt-3 text-sm leading-7 text-slate-500">クリエイターが確認後、見積もりを送信します</p><button type="button" onClick={onClose} className="mt-7 h-12 w-full rounded-full bg-slate-950 text-sm font-semibold text-white">閉じる</button></div> : <form onSubmit={(e) => { e.preventDefault(); if (kind === "simple" || step === 5) void submit(); else next(); }} className="flex min-h-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-5">{renderStep()}<label className="absolute -left-[10000px]" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label>{error ? <p role="alert" className="mt-5 text-[13px] font-medium text-rose-600">{error}</p> : null}</main>
          <footer className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">{kind === "pr" && step > 0 ? <button type="button" onClick={() => { setStep((current) => current - 1); setError(""); }} className="h-12 w-24 rounded-full bg-slate-100 text-sm font-semibold text-slate-700">戻る</button> : null}<button type="submit" disabled={!canAdvance} className="h-12 flex-1 rounded-full bg-slate-950 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">{submitting ? "送信中…" : kind === "simple" ? "送信する" : step === 5 ? "この内容で見積もりを依頼" : "次へ"}</button></footer>
        </form>}
      </section>
    </div>
  );
}
