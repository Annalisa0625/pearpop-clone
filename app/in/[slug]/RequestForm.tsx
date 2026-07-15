// File: app/in/[slug]/RequestForm.tsx
"use client";

import { useMemo, useState } from "react";

type InquiryType =
  | "pr_post"
  | "product_review"
  | "visit_event"
  | "ugc"
  | "other";

type FormState = {
  inquiryType: InquiryType;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  productName: string;
  productUrl: string;
  desiredTiming: string;
  budgetText: string;
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
    description: "まずは相談したい場合",
  },
];

function getInquiryTypeFromHash(): InquiryType {
  if (typeof window === "undefined") return "pr_post";

  const hash = window.location.hash.replace("#request-form-", "");

  if (
    hash === "pr_post" ||
    hash === "product_review" ||
    hash === "visit_event" ||
    hash === "ugc" ||
    hash === "other"
  ) {
    return hash;
  }

  return "pr_post";
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
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

export default function RequestForm({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    inquiryType: getInquiryTypeFromHash(),
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    productName: "",
    productUrl: "",
    desiredTiming: "",
    budgetText: "",
    message: "",
    website: "",
  }));

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const selectedOption = useMemo(
    () =>
      inquiryOptions.find((option) => option.value === form.inquiryType) ??
      inquiryOptions[0],
    [form.inquiryType]
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setError("");

    if (!form.contactEmail.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }

    if (!form.message.trim()) {
      setError("相談内容を入力してください。");
      return;
    }

    setSubmitting(true);

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
          contactPhone: form.contactPhone,
          productName: form.productName,
          productUrl: form.productUrl,
          desiredTiming: form.desiredTiming,
          budgetText: form.budgetText,
          message: form.message,
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
        id={`request-form-${form.inquiryType}`}
        className="rounded-[30px] border border-emerald-100 bg-emerald-50 p-5 text-emerald-950"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
          ✓
        </div>

        <h2 className="mt-4 text-xl font-black tracking-[-0.04em]">
          相談内容を送信しました
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-emerald-900/75">
          {creatorName}さんへの相談内容を受け付けました。内容確認後、必要に応じてTrend Martからご連絡します。
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
      id={`request-form-${form.inquiryType}`}
      className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]"
    >
      <p className="text-xs font-black text-rose-500">REQUEST FORM</p>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
        {creatorName}さんに相談する
      </h2>

      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
        ここでの送信は正式注文ではありません。内容を確認したうえで、必要に応じてTrend Mart上で正式依頼に進みます。
      </p>

      <div className="mt-5">
        <p className="text-sm font-black text-slate-800">
          相談したい内容 <span className="text-rose-500">*</span>
        </p>

        <div className="mt-3 grid gap-2">
          {inquiryOptions.map((option) => {
            const active = form.inquiryType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update("inquiryType", option.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-rose-300 bg-rose-50 ring-4 ring-rose-100"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-black text-slate-950">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-6 text-slate-500">
          選択中：{selectedOption.label}
        </p>
      </div>

      <div className="mt-6 space-y-4">
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

        <TextInput
          label="電話番号"
          value={form.contactPhone}
          onChange={(value) => update("contactPhone", value)}
          placeholder="任意"
          type="tel"
        />

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

        <TextInput
          label="希望時期"
          value={form.desiredTiming}
          onChange={(value) => update("desiredTiming", value)}
          placeholder="例：8月上旬 / なるべく早め / 未定"
        />

        <TextInput
          label="予算感"
          value={form.budgetText}
          onChange={(value) => update("budgetText", value)}
          placeholder="例：3万円前後 / 相談したい"
        />

        <TextArea
          label="相談内容"
          value={form.message}
          onChange={(value) => update("message", value)}
          placeholder="依頼したい内容、投稿してほしいSNS、希望する訴求内容、商品提供の有無などを入力してください。"
          required
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

      {error ? (
        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-rose-500 px-6 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(244,63,94,0.24)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "送信中..." : "相談内容を送信する"}
      </button>

      <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-slate-400">
        送信後、正式な依頼・決済に進む場合はTrend Mart上で手続きを行います。
      </p>
    </div>
  );
}