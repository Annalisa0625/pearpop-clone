// File: app/in/[slug]/RequestForm.tsx
"use client";

import { useMemo, useState } from "react";

type InquiryType =
  | "pr_post"
  | "product_review"
  | "visit_event"
  | "ugc"
  | "other";

type PurposeType =
  | "awareness"
  | "sales"
  | "store_visit"
  | "ugc_assets"
  | "other";

type TimingType =
  | "asap"
  | "this_month"
  | "next_month"
  | "undecided";

type BudgetType =
  | "under_30000"
  | "30000_50000"
  | "50000_100000"
  | "over_100000"
  | "consult";

type OfferType =
  | "yes"
  | "no"
  | "undecided";

type FormState = {
  inquiryType: InquiryType;
  purpose: PurposeType | "";
  platform: string;
  productName: string;
  productUrl: string;
  desiredTiming: TimingType | "";
  budgetText: BudgetType | "";
  offerType: OfferType | "";
  companyName: string;
  contactName: string;
  contactEmail: string;
  message: string;
  website: string;
};

const inquiryOptions: Array<{
  value: InquiryType;
  label: string;
  description: string;
}> = [
  {
    value: "pr_post",
    label: "PR投稿",
    description: "Instagram投稿・リール・TikTokなど",
  },
  {
    value: "product_review",
    label: "商品レビュー",
    description: "商品提供・使用感レビュー・紹介投稿",
  },
  {
    value: "visit_event",
    label: "来店・イベント出演",
    description: "店舗PR・体験レポート・イベント参加",
  },
  {
    value: "ugc",
    label: "UGC制作",
    description: "広告素材・LP素材・SNS用動画制作",
  },
  {
    value: "other",
    label: "その他",
    description: "まずは内容だけ相談したい場合",
  },
];

const purposeOptions: Array<{
  value: PurposeType;
  label: string;
  description: string;
}> = [
  {
    value: "awareness",
    label: "認知を広げたい",
    description: "商品・店舗・サービスを知ってもらいたい",
  },
  {
    value: "sales",
    label: "購入につなげたい",
    description: "商品の魅力や使用感を伝えたい",
  },
  {
    value: "store_visit",
    label: "来店を増やしたい",
    description: "店舗・イベント・体験への来訪を促したい",
  },
  {
    value: "ugc_assets",
    label: "素材がほしい",
    description: "広告・LP・SNSで使う写真や動画がほしい",
  },
  {
    value: "other",
    label: "まだ決まっていない",
    description: "まずは相談しながら決めたい",
  },
];

const platformOptions = [
  "Instagram",
  "TikTok",
  "YouTube",
  "おまかせ",
];

const timingOptions: Array<{
  value: TimingType;
  label: string;
}> = [
  { value: "asap", label: "なるべく早め" },
  { value: "this_month", label: "今月中" },
  { value: "next_month", label: "来月以降" },
  { value: "undecided", label: "未定" },
];

const budgetOptions: Array<{
  value: BudgetType;
  label: string;
}> = [
  { value: "under_30000", label: "3万円未満" },
  { value: "30000_50000", label: "3〜5万円" },
  { value: "50000_100000", label: "5〜10万円" },
  { value: "over_100000", label: "10万円以上" },
  { value: "consult", label: "相談したい" },
];

const offerOptions: Array<{
  value: OfferType;
  label: string;
}> = [
  { value: "yes", label: "商品・体験の提供あり" },
  { value: "no", label: "提供なし" },
  { value: "undecided", label: "未定" },
];

function findLabel<T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T | ""
) {
  return options.find((option) => option.value === value)?.label ?? "未選択";
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

function OptionCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-rose-300 bg-rose-50 ring-4 ring-rose-100"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-black text-slate-950">{title}</span>
      {body ? (
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
          {body}
        </span>
      ) : null}
    </button>
  );
}

export default function RequestForm({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>({
    inquiryType: "pr_post",
    purpose: "",
    platform: "",
    productName: "",
    productUrl: "",
    desiredTiming: "",
    budgetText: "",
    offerType: "",
    companyName: "",
    contactName: "",
    contactEmail: "",
    message: "",
    website: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const selectedInquiryLabel = useMemo(
    () => findLabel(inquiryOptions, form.inquiryType),
    [form.inquiryType]
  );

  const selectedPurposeLabel = useMemo(
    () => findLabel(purposeOptions, form.purpose),
    [form.purpose]
  );

  const selectedTimingLabel = useMemo(
    () => findLabel(timingOptions, form.desiredTiming),
    [form.desiredTiming]
  );

  const selectedBudgetLabel = useMemo(
    () => findLabel(budgetOptions, form.budgetText),
    [form.budgetText]
  );

  const selectedOfferLabel = useMemo(
    () => findLabel(offerOptions, form.offerType),
    [form.offerType]
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const validateCurrentStep = () => {
    setError("");

    if (step === 1 && !form.purpose) {
      setError("目的を選択してください。");
      return false;
    }

    if (step === 2 && !form.desiredTiming) {
      setError("希望時期を選択してください。");
      return false;
    }

    if (step === 2 && !form.budgetText) {
      setError("予算感を選択してください。");
      return false;
    }

    if (step === 3 && !form.contactEmail.trim()) {
      setError("メールアドレスを入力してください。");
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;

    setStep((current) => Math.min(current + 1, totalSteps - 1));
    setError("");
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
    setError("");
  };

  const buildMessage = () => {
    const lines = [
      `相談タイプ：${selectedInquiryLabel}`,
      `目的：${selectedPurposeLabel}`,
      `希望SNS・媒体：${form.platform || "未選択"}`,
      `希望時期：${selectedTimingLabel}`,
      `予算感：${selectedBudgetLabel}`,
      `商品・体験提供：${selectedOfferLabel}`,
      "",
      "補足メモ：",
      form.message.trim() || "なし",
    ];

    return lines.join("\n");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorId,
          inquiryType: form.inquiryType,
          companyName: form.companyName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: "",
          productName: form.productName,
          productUrl: form.productUrl,
          desiredTiming: selectedTimingLabel,
          budgetText: selectedBudgetLabel,
          message: buildMessage(),
          website: form.website,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "送信に失敗しました。");
      }

      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "送信に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        id="request-form"
        className="rounded-[30px] border border-emerald-100 bg-emerald-50 p-5 text-emerald-950"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
          ✓
        </div>

        <h2 className="mt-4 text-xl font-black tracking-[-0.04em]">
          相談内容を送信しました
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-emerald-900/75">
          {creatorName}
          さんへの相談内容を受け付けました。内容確認後、必要に応じてTrend
          Martからご連絡します。
        </p>

        <a
          href="#"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-black text-white"
        >
          ページ上部に戻る
        </a>
      </div>
    );
  }

  return (
    <div
      id="request-form"
      className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.05em]">
            {creatorName}さんに相談する
          </h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            まだ正式注文ではありません。内容を送信後、必要に応じて見積もり・正式依頼に進みます。
          </p>
        </div>

        <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
          {step + 1}/{totalSteps}
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-rose-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 min-h-[420px]">
        {step === 0 ? (
          <div>
            <h3 className="text-lg font-black tracking-[-0.04em]">
              何を相談しますか？
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              近いものを選んでください。詳細はあとから相談できます。
            </p>

            <div className="mt-4 grid gap-2">
              {inquiryOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  active={form.inquiryType === option.value}
                  title={option.label}
                  body={option.description}
                  onClick={() => update("inquiryType", option.value)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h3 className="text-lg font-black tracking-[-0.04em]">
              目的を選んでください
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              依頼の目的に近いものを選択してください。
            </p>

            <div className="mt-4 grid gap-2">
              {purposeOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  active={form.purpose === option.value}
                  title={option.label}
                  body={option.description}
                  onClick={() => update("purpose", option.value)}
                />
              ))}
            </div>

            <div className="mt-5">
              <p className="text-sm font-black text-slate-800">
                希望SNS・媒体
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {platformOptions.map((platform) => {
                  const active = form.platform === platform;

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => update("platform", platform)}
                      className={`rounded-full px-4 py-2 text-sm font-black transition ${
                        active
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="text-lg font-black tracking-[-0.04em]">
              商品・条件を教えてください
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              決まっていない項目は未入力でも大丈夫です。
            </p>

            <div className="mt-5 space-y-4">
              <TextInput
                label="商品・サービス名"
                value={form.productName}
                onChange={(value) => update("productName", value)}
                placeholder="例：新作美容液 / 新店舗オープン告知"
              />

              <TextInput
                label="商品・サービスURL"
                value={form.productUrl}
                onChange={(value) => update("productUrl", value)}
                placeholder="https://..."
                type="url"
              />

              <div>
                <p className="text-sm font-black text-slate-800">
                  希望時期 <span className="text-rose-500">*</span>
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {timingOptions.map((option) => {
                    const active = form.desiredTiming === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update("desiredTiming", option.value)}
                        className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                          active
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  予算感 <span className="text-rose-500">*</span>
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {budgetOptions.map((option) => {
                    const active = form.budgetText === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update("budgetText", option.value)}
                        className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                          active
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-slate-800">
                  商品・体験の提供
                </p>

                <div className="mt-3 grid gap-2">
                  {offerOptions.map((option) => {
                    const active = form.offerType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update("offerType", option.value)}
                        className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                          active
                            ? "bg-rose-50 text-rose-600 ring-4 ring-rose-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h3 className="text-lg font-black tracking-[-0.04em]">
              連絡先と補足を入力
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              返信に必要な連絡先を入力してください。
            </p>

            <div className="mt-5 space-y-4">
              <TextInput
                label="会社名・店舗名"
                value={form.companyName}
                onChange={(value) => update("companyName", value)}
                placeholder="例：株式会社〇〇 / 〇〇カフェ"
              />

              <TextInput
                label="担当者名"
                value={form.contactName}
                onChange={(value) => update("contactName", value)}
                placeholder="例：山田 太郎"
              />

              <TextInput
                label="メールアドレス"
                value={form.contactEmail}
                onChange={(value) => update("contactEmail", value)}
                placeholder="例：contact@example.com"
                type="email"
                required
              />

              <TextArea
                label="補足メモ"
                value={form.message}
                onChange={(value) => update("message", value)}
                placeholder="投稿で伝えてほしい内容、商品提供の詳細、確認したいことなどがあれば入力してください。"
              />

              <input
                type="text"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-400">
                相談内容の確認
              </p>
              <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-700">
                <p>相談：{selectedInquiryLabel}</p>
                <p>目的：{selectedPurposeLabel}</p>
                <p>希望時期：{selectedTimingLabel}</p>
                <p>予算感：{selectedBudgetLabel}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex h-13 w-24 items-center justify-center rounded-full bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            戻る
          </button>
        ) : null}

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex flex-1 items-center justify-center rounded-full bg-rose-500 px-6 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(244,63,94,0.24)] transition hover:bg-rose-600"
          >
            次へ
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center rounded-full bg-rose-500 px-6 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(244,63,94,0.24)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "送信中..." : "相談内容を送信する"}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-slate-400">
        正式な依頼・決済に進む場合は、Trend Mart上で手続きを行います。
      </p>
    </div>
  );
}