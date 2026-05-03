//app/legal/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "ja" | "en";

const UPDATED_AT = "2026-03-29";

const legalInfo = {
  serviceNameJa: "Trendre",
  serviceNameEn: "Trendre",
  operatorNameJa: "運営者名を記載してください",
  operatorNameEn: "Please replace with your operator name",
  representativeJa: "代表者名を記載してください",
  representativeEn: "Please replace with your representative name",
  addressJa: "所在地は請求があった場合、遅滞なく開示します。",
  addressEn: "Business address will be disclosed without delay upon request.",
  phoneJa: "電話番号は請求があった場合、遅滞なく開示します。",
  phoneEn: "Phone number will be disclosed without delay upon request.",
  email: "support@example.com",
  priceJa:
    "料金ページまたは申込画面に表示する各プラン料金、手数料、その他の表示価格に従います。",
  priceEn:
    "Prices follow the amounts displayed on the pricing page, checkout screen, or other applicable billing screens.",
  extraFeeJa:
    "インターネット接続料金、通信料金、銀行振込手数料等は利用者負担です。",
  extraFeeEn:
    "Internet access fees, communication fees, bank transfer charges, and similar costs are borne by the user.",
  paymentMethodJa:
    "クレジットカードその他、当社が定める方法によります。",
  paymentMethodEn:
    "Payment is made by credit card or any other method designated by us.",
  paymentTimingJa:
    "月額プランは申込時および更新時、その他の料金は各申込画面または請求画面に従います。",
  paymentTimingEn:
    "Subscription fees are charged at sign-up and renewal; other fees follow the applicable checkout or billing screen.",
  deliveryJa:
    "デジタルサービスのため、利用開始条件を満たした後、当社所定の方法で提供します。",
  deliveryEn:
    "Because this is a digital service, access is provided through the Service once the applicable start conditions are met.",
  cancellationJa:
    "デジタルサービスの性質上、利用開始後の返金・キャンセルは、法令上必要な場合または当社が別途認める場合を除き対応しません。",
  cancellationEn:
    "Due to the nature of digital services, refunds or cancellations after service commencement are not available except where required by law or expressly approved by us.",
  environmentJa:
    "推奨ブラウザ・推奨環境は本サービス上または当社が別途示す内容をご確認ください。",
  environmentEn:
    "Please refer to the Service or our separate notices for supported browsers and recommended environments.",
};

function LanguageTabs({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (value: Lang) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-300 p-1">
      <button
        type="button"
        onClick={() => setLang("ja")}
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          lang === "ja"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        日本語
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          lang === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        English
      </button>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-200 py-4 md:grid-cols-[220px_1fr]">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-sm leading-7 text-slate-700">{value}</div>
    </div>
  );
}

export default function LegalPage() {
  const [lang, setLang] = useState<Lang>("ja");

  const isJa = lang === "ja";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">
              {isJa ? "法務ページ" : "Legal"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {isJa ? "事業者情報" : "Business Information"}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {isJa
                ? `最終更新日：${UPDATED_AT}`
                : `Last updated: ${UPDATED_AT}`}
            </p>
          </div>

          <LanguageTabs lang={lang} setLang={setLang} />
        </div>

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {isJa
            ? "公開前に、運営者情報・価格・返金条件などを実運営に合わせて確認してください。"
            : "Before publishing, confirm your operator details, pricing, and refund conditions so they match your actual operations."}
        </div>

        <section className="rounded-2xl border border-slate-200 p-6">
          <InfoRow
            label={isJa ? "販売事業者" : "Business Operator"}
            value={isJa ? legalInfo.operatorNameJa : legalInfo.operatorNameEn}
          />
          <InfoRow
            label={isJa ? "代表者" : "Representative"}
            value={isJa ? legalInfo.representativeJa : legalInfo.representativeEn}
          />
          <InfoRow
            label={isJa ? "サービス名" : "Service Name"}
            value={isJa ? legalInfo.serviceNameJa : legalInfo.serviceNameEn}
          />
          <InfoRow
            label={isJa ? "所在地" : "Address"}
            value={isJa ? legalInfo.addressJa : legalInfo.addressEn}
          />
          <InfoRow
            label={isJa ? "電話番号" : "Phone Number"}
            value={isJa ? legalInfo.phoneJa : legalInfo.phoneEn}
          />
          <InfoRow
            label={isJa ? "メールアドレス" : "Email Address"}
            value={legalInfo.email}
          />
          <InfoRow
            label={isJa ? "販売価格" : "Price"}
            value={isJa ? legalInfo.priceJa : legalInfo.priceEn}
          />
          <InfoRow
            label={isJa ? "商品代金以外の必要料金" : "Additional Fees"}
            value={isJa ? legalInfo.extraFeeJa : legalInfo.extraFeeEn}
          />
          <InfoRow
            label={isJa ? "支払方法" : "Payment Method"}
            value={isJa ? legalInfo.paymentMethodJa : legalInfo.paymentMethodEn}
          />
          <InfoRow
            label={isJa ? "支払時期" : "Payment Timing"}
            value={isJa ? legalInfo.paymentTimingJa : legalInfo.paymentTimingEn}
          />
          <InfoRow
            label={isJa ? "提供時期" : "Delivery / Service Start"}
            value={isJa ? legalInfo.deliveryJa : legalInfo.deliveryEn}
          />
          <InfoRow
            label={isJa ? "キャンセル・返金" : "Cancellation / Refund"}
            value={isJa ? legalInfo.cancellationJa : legalInfo.cancellationEn}
          />
          <InfoRow
            label={isJa ? "動作環境" : "System Environment"}
            value={isJa ? legalInfo.environmentJa : legalInfo.environmentEn}
          />
        </section>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="text-slate-700 underline underline-offset-4">
            {isJa ? "利用規約" : "Terms of Service"}
          </Link>
          <Link href="/privacy" className="text-slate-700 underline underline-offset-4">
            {isJa ? "プライバシーポリシー" : "Privacy Policy"}
          </Link>
          <Link href="/login" className="text-slate-700 underline underline-offset-4">
            {isJa ? "ログインへ戻る" : "Back to login"}
          </Link>
        </div>
      </div>
    </main>
  );
}