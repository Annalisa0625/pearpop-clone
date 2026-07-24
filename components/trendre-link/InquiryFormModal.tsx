"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { CreatorLinkInquiryFormKind } from "@/lib/trendre-link/inquiry-forms";
import type { CreatorLinkPublicInquiryResponse } from "@/lib/trendre-link/types";

type Fields = {
  contactName: string;
  contactEmail: string;
  subject: string;
  message: string;
  companyName: string;
  requestContent: string;
  productName: string;
  requestedPlatforms: string[];
  desiredTiming: string;
  budget: string;
  offerType: string;
  details: string;
  website: string;
  campaignGoal: string;
  contentFormats: string[];
  deliverableCount: number;
  usageRights: string;
  productUrl: string;
  referenceUrl: string;
  keyMessage: string;
};

const EMPTY_FIELDS: Fields = {
  contactName: "",
  contactEmail: "",
  subject: "",
  message: "",
  companyName: "",
  requestContent: "",
  productName: "",
  requestedPlatforms: [],
  desiredTiming: "",
  budget: "",
  offerType: "",
  details: "",
  website: "",
  campaignGoal: "",
  contentFormats: [],
  deliverableCount: 1,
  usageRights: "",
  productUrl: "",
  referenceUrl: "",
  keyMessage: "",
};

const PLATFORM_OPTIONS = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["x", "X"],
  ["youtube", "YouTube"],
  ["other", "その他"],
] as const;

const REQUEST_OPTIONS = [
  ["pr_post", "PR投稿", "クリエイターのアカウントから投稿"],
  ["ugc", "UGC制作", "写真や動画素材を制作して納品"],
  ["product_review", "商品レビュー", "使用感や体験を紹介"],
  ["visit_event", "来店・体験", "店舗・施設・イベントを体験"],
  ["other", "その他", "上記以外の内容を相談"],
] as const;

const FORMAT_OPTIONS = [
  ["feed", "フィード投稿"],
  ["reel", "リール"],
  ["story", "ストーリーズ"],
  ["short_video", "ショート動画"],
  ["long_video", "長尺動画"],
  ["photo", "写真素材"],
  ["live", "ライブ配信"],
  ["other", "その他"],
] as const;

const GOAL_OPTIONS = [
  ["awareness", "認知を広げたい"],
  ["product_launch", "新商品を知ってほしい"],
  ["sales", "購入につなげたい"],
  ["store_visit", "来店を増やしたい"],
  ["content_asset", "広告素材がほしい"],
  ["other", "その他"],
] as const;

const OFFER_OPTIONS = [
  ["provided", "商品を提供する"],
  ["not_provided", "提供なし"],
  ["consult", "相談して決める"],
] as const;

const USAGE_OPTIONS = [
  ["none", "二次利用なし"],
  ["organic", "自社SNS・サイトで利用"],
  ["paid_ads", "広告にも利用"],
  ["undecided", "相談して決める"],
] as const;

const PR_STEP_TITLES = ["依頼タイプ", "制作内容", "条件・予算", "企業情報"] as const;
const PR_STEP_DESCRIPTIONS = [
  "まず、依頼したい内容を選んでください",
  "掲載先と制作物の内容を選びます",
  "見積もりに必要な条件を入力します",
  "連絡先と補足情報を入力してください",
] as const;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="m4 10 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-[13px] font-semibold text-slate-900">
      {children}
      {required ? <span className="ml-1 text-[#e22645]">*</span> : null}
    </span>
  );
}

function SelectTile({
  checked,
  title,
  body,
  onClick,
}: {
  checked: boolean;
  title: string;
  body?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left ring-1 transition duration-200 active:scale-[0.985] ${
        checked
          ? "bg-slate-950 text-white ring-slate-950"
          : "bg-white text-slate-950 ring-slate-200 active:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${
          checked
            ? "bg-white text-slate-950 ring-white"
            : "text-transparent ring-slate-300"
        }`}
      >
        <CheckIcon />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{title}</span>
        {body ? (
          <span className={`mt-0.5 block text-[11px] leading-5 ${checked ? "text-white/60" : "text-slate-400"}`}>
            {body}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function InquiryFormModal({
  kind,
  title,
  slug,
  mode,
  locale,
  onClose,
}: {
  kind: CreatorLinkInquiryFormKind;
  title: string;
  slug: string;
  mode: "preview" | "public";
  locale: "ja" | "en";
  onClose: () => void;
}) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.body.style.overflow;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keydown);
      returnFocus?.focus({ preventScroll: true });
    };
  }, []);

  const update = (
    key: keyof Omit<Fields, "requestedPlatforms" | "contentFormats" | "deliverableCount">,
    value: string
  ) => setFields((current) => ({ ...current, [key]: value }));

  const toggleArray = (key: "requestedPlatforms" | "contentFormats", value: string) => {
    setFields((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const validateStep = (targetStep: number) => {
    if (kind !== "pr") return true;

    if (targetStep === 0 && !fields.requestContent) {
      return "依頼内容を選択してください。";
    }

    if (targetStep === 1) {
      if (fields.requestedPlatforms.length === 0) {
        return "希望するSNSを1つ以上選択してください。";
      }
      if (fields.contentFormats.length === 0) {
        return "希望する制作物を1つ以上選択してください。";
      }
      if (fields.deliverableCount < 1 || fields.deliverableCount > 20) {
        return "制作数を確認してください。";
      }
    }

    if (targetStep === 2) {
      if (!fields.productName.trim()) return "商品・サービス名を入力してください。";
      if (!fields.campaignGoal) return "今回の目的を選択してください。";
      if (!fields.desiredTiming.trim()) return "希望時期を入力してください。";
      if (!fields.budget.trim()) return "予算目安を入力してください。";
      if (!fields.offerType) return "商品提供について選択してください。";
      if (!fields.usageRights) return "二次利用について選択してください。";
    }

    if (targetStep === 3) {
      if (!fields.companyName.trim()) return "会社名・ブランド名を入力してください。";
      if (!fields.contactName.trim()) return "担当者名を入力してください。";
      if (!fields.contactEmail.trim()) return "メールアドレスを入力してください。";
    }

    return true;
  };

  const goNext = () => {
    const result = validateStep(step);
    if (result !== true) {
      setError(result);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, 3));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== "public" || submitting) return;

    const result = validateStep(kind === "pr" ? 3 : 0);
    if (result !== true) {
      setError(result);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/public/creator-link/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, formKind: kind, ...fields }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        typeof data !== "object" ||
        data === null ||
        !("ok" in data) ||
        (data as CreatorLinkPublicInquiryResponse).ok !== true
      ) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "送信できませんでした。もう一度お試しください。";
        throw new Error(message);
      }
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "送信できませんでした。もう一度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 h-12 w-full rounded-[14px] bg-slate-50 px-4 text-[15px] text-slate-950 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20";
  const textareaClass =
    "mt-2 w-full resize-none rounded-[14px] bg-slate-50 px-4 py-3 text-[15px] leading-6 text-slate-950 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-slate-950/20";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/40 backdrop-blur-[3px] md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white text-slate-950 shadow-[0_-18px_70px_rgba(15,23,42,0.22)] md:max-w-xl md:rounded-[24px]"
      >
        <header className="shrink-0 border-b border-slate-100 bg-white/96 px-5 pb-3 pt-3 backdrop-blur-xl">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
          <div className="flex min-h-10 items-center justify-between gap-3">
            {kind === "pr" && step > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((current) => Math.max(current - 1, 0));
                }}
                className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:scale-90 active:bg-slate-100"
                aria-label="戻る"
              >
                <BackIcon />
              </button>
            ) : (
              <div className="w-8" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1 text-center">
              <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition active:scale-90 active:bg-slate-100"
              aria-label={locale === "ja" ? "閉じる" : "Close"}
            >
              <CloseIcon />
            </button>
          </div>

          {kind === "pr" ? (
            <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`${step + 1} / 4`}>
              {[0, 1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={`h-1 rounded-full transition-colors duration-300 ${
                    item <= step ? "bg-slate-950" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </header>

        {sent ? (
          <div className="overflow-y-auto px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
              <CheckIcon />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">送信しました</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              クリエイターが内容を確認し、サービス内で見積もりを送ります
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 h-12 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white transition active:scale-[0.97]"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {kind === "simple" ? (
                <div className="space-y-5">
                  <label className="block">
                    <FieldLabel required>{locale === "ja" ? "お名前" : "Name"}</FieldLabel>
                    <input
                      required
                      value={fields.contactName}
                      maxLength={80}
                      onChange={(event) => update("contactName", event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel required>{locale === "ja" ? "メールアドレス" : "Email"}</FieldLabel>
                    <input
                      required
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={fields.contactEmail}
                      maxLength={254}
                      placeholder="name@example.com"
                      onChange={(event) => update("contactEmail", event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>{locale === "ja" ? "件名" : "Subject"}</FieldLabel>
                    <input
                      value={fields.subject}
                      maxLength={120}
                      onChange={(event) => update("subject", event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel required>{locale === "ja" ? "お問い合わせ内容" : "Message"}</FieldLabel>
                    <textarea
                      required
                      rows={6}
                      value={fields.message}
                      maxLength={3000}
                      onChange={(event) => update("message", event.target.value)}
                      className={textareaClass}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[20px] font-semibold tracking-[-0.04em]">
                        {PR_STEP_TITLES[step]}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400">{step + 1} / 4</p>
                    </div>
                    <p className="mt-1 text-[13px] leading-6 text-slate-500">
                      {PR_STEP_DESCRIPTIONS[step]}
                    </p>
                  </div>

                  {step === 0 ? (
                    <fieldset>
                      <legend className="sr-only">依頼したいこと</legend>
                      <div className="space-y-2">
                        {REQUEST_OPTIONS.map(([value, optionTitle, body]) => (
                          <SelectTile
                            key={value}
                            checked={fields.requestContent === value}
                            title={optionTitle}
                            body={body}
                            onClick={() => update("requestContent", value)}
                          />
                        ))}
                      </div>
                    </fieldset>
                  ) : null}

                  {step === 1 ? (
                    <div className="space-y-6">
                      <fieldset>
                        <legend><FieldLabel required>希望するSNS</FieldLabel></legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {PLATFORM_OPTIONS.map(([value, label]) => {
                            const checked = fields.requestedPlatforms.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleArray("requestedPlatforms", value)}
                                className={`min-h-10 rounded-full px-4 text-[13px] font-medium ring-1 transition active:scale-[0.97] ${
                                  checked
                                    ? "bg-slate-950 text-white ring-slate-950"
                                    : "bg-white text-slate-600 ring-slate-200"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <fieldset>
                        <legend><FieldLabel required>希望する制作物</FieldLabel></legend>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {FORMAT_OPTIONS.map(([value, label]) => {
                            const checked = fields.contentFormats.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleArray("contentFormats", value)}
                                className={`flex min-h-11 items-center justify-between rounded-[13px] px-3 text-left text-[13px] font-medium ring-1 transition active:scale-[0.98] ${
                                  checked
                                    ? "bg-slate-950 text-white ring-slate-950"
                                    : "bg-white text-slate-700 ring-slate-200"
                                }`}
                              >
                                {label}
                                {checked ? <CheckIcon /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div>
                        <FieldLabel required>制作数</FieldLabel>
                        <div className="mt-3 flex h-12 items-center justify-between rounded-[14px] bg-slate-50 px-2 ring-1 ring-slate-200">
                          <button
                            type="button"
                            onClick={() =>
                              setFields((current) => ({
                                ...current,
                                deliverableCount: Math.max(1, current.deliverableCount - 1),
                              }))
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-slate-700 ring-1 ring-slate-200 transition active:scale-90"
                            aria-label="制作数を減らす"
                          >
                            −
                          </button>
                          <span className="text-[15px] font-semibold">{fields.deliverableCount}件</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFields((current) => ({
                                ...current,
                                deliverableCount: Math.min(20, current.deliverableCount + 1),
                              }))
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xl text-white transition active:scale-90"
                            aria-label="制作数を増やす"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-6">
                      <label className="block">
                        <FieldLabel required>商品・サービス名</FieldLabel>
                        <input
                          value={fields.productName}
                          maxLength={200}
                          placeholder="例：新作スキンケアシリーズ"
                          onChange={(event) => update("productName", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel>商品・サービスURL</FieldLabel>
                        <input
                          type="url"
                          inputMode="url"
                          value={fields.productUrl}
                          maxLength={500}
                          placeholder="https://"
                          onChange={(event) => update("productUrl", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <fieldset>
                        <legend><FieldLabel required>今回の目的</FieldLabel></legend>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {GOAL_OPTIONS.map(([value, label]) => {
                            const checked = fields.campaignGoal === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => update("campaignGoal", value)}
                                className={`min-h-12 rounded-[13px] px-3 text-left text-[13px] font-medium ring-1 transition active:scale-[0.98] ${
                                  checked
                                    ? "bg-slate-950 text-white ring-slate-950"
                                    : "bg-white text-slate-700 ring-slate-200"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <label className="block">
                        <FieldLabel required>希望時期</FieldLabel>
                        <input
                          value={fields.desiredTiming}
                          maxLength={120}
                          placeholder="例：2026年9月中 / 商品到着後2週間以内"
                          onChange={(event) => update("desiredTiming", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel required>予算目安</FieldLabel>
                        <div className="mt-2 flex h-12 items-center rounded-[14px] bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-950/20">
                          <span className="mr-2 text-base text-slate-400">¥</span>
                          <input
                            value={fields.budget}
                            inputMode="numeric"
                            placeholder="100000"
                            onChange={(event) => update("budget", event.target.value.replace(/[^0-9]/g, ""))}
                            className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                          />
                        </div>
                      </label>

                      <fieldset>
                        <legend><FieldLabel required>商品提供</FieldLabel></legend>
                        <div className="mt-3 space-y-2">
                          {OFFER_OPTIONS.map(([value, label]) => (
                            <SelectTile
                              key={value}
                              checked={fields.offerType === value}
                              title={label}
                              onClick={() => update("offerType", value)}
                            />
                          ))}
                        </div>
                      </fieldset>

                      <fieldset>
                        <legend><FieldLabel required>制作物の二次利用</FieldLabel></legend>
                        <div className="mt-3 space-y-2">
                          {USAGE_OPTIONS.map(([value, label]) => (
                            <SelectTile
                              key={value}
                              checked={fields.usageRights === value}
                              title={label}
                              onClick={() => update("usageRights", value)}
                            />
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="space-y-5">
                      <label className="block">
                        <FieldLabel required>会社名・ブランド名</FieldLabel>
                        <input
                          value={fields.companyName}
                          maxLength={120}
                          placeholder="例：Trendre株式会社"
                          onChange={(event) => update("companyName", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel required>担当者名</FieldLabel>
                        <input
                          value={fields.contactName}
                          maxLength={80}
                          onChange={(event) => update("contactName", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel required>メールアドレス</FieldLabel>
                        <input
                          type="email"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={fields.contactEmail}
                          maxLength={254}
                          placeholder="name@example.com"
                          onChange={(event) => update("contactEmail", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel>必ず伝えたいこと</FieldLabel>
                        <textarea
                          rows={4}
                          value={fields.keyMessage}
                          maxLength={1000}
                          placeholder="入れてほしい内容、避けてほしい表現、必須ハッシュタグなど"
                          onChange={(event) => update("keyMessage", event.target.value)}
                          className={textareaClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel>参考URL</FieldLabel>
                        <input
                          type="url"
                          inputMode="url"
                          value={fields.referenceUrl}
                          maxLength={500}
                          placeholder="参考にしてほしい投稿や資料のURL"
                          onChange={(event) => update("referenceUrl", event.target.value)}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel>その他の補足</FieldLabel>
                        <textarea
                          rows={4}
                          value={fields.details}
                          maxLength={3000}
                          placeholder="クリエイターへ事前に伝えたい内容があれば入力してください"
                          onChange={(event) => update("details", event.target.value)}
                          className={textareaClass}
                        />
                      </label>
                    </div>
                  ) : null}
                </>
              )}

              <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={fields.website}
                  onChange={(event) => update("website", event.target.value)}
                />
              </label>

              {error ? (
                <p role="alert" className="mt-5 text-[13px] font-medium text-[#d62845]">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-white/96 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
              {kind === "pr" && step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="h-12 w-full rounded-full bg-slate-950 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition active:scale-[0.975]"
                >
                  次へ
                </button>
              ) : mode === "preview" ? (
                <button
                  type="button"
                  disabled
                  className="h-12 w-full rounded-full bg-slate-100 text-sm font-semibold text-slate-400"
                >
                  送信は公開ページで行えます
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-full bg-slate-950 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition active:scale-[0.975] disabled:opacity-50"
                >
                  {submitting ? "送信中…" : kind === "pr" ? "この内容で見積もりを依頼" : "送信する"}
                </button>
              )}
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
