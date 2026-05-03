//app/privacy/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "ja" | "en";

const UPDATED_AT = "2026-03-29";

const operator = {
  serviceNameJa: "Trendre",
  serviceNameEn: "Trendre",
  operatorNameJa: "運営者名を記載してください",
  operatorNameEn: "Please replace with your operator name",
  email: "support@example.com",
};

const jaSections = [
  {
    title: "1. 基本方針",
    body: [
      "当社は、本サービスにおける利用者の個人情報および関連情報を、個人情報保護法その他の関係法令に従い適切に取り扱います。",
      "本ポリシーは、本サービスに関連して当社が取得する情報の取扱いを定めるものです。",
    ],
  },
  {
    title: "2. 取得する情報",
    body: [
      "当社は、以下の情報を取得する場合があります。",
      "・氏名、表示名、会社名、担当者名",
      "・メールアドレス、電話番号、住所等の連絡情報",
      "・ログイン情報、認証関連情報",
      "・プロフィール情報、SNS情報、フォロワー帯、主な視聴者国",
      "・案件情報、依頼内容、納品URL、チャット内容、通報内容",
      "・支払いに関連する情報（ただしカード番号等を当社が直接保持しない場合があります）",
      "・Cookie、IPアドレス、端末情報、ブラウザ情報、利用履歴、アクセスログ等",
    ],
  },
  {
    title: "3. 取得方法",
    body: [
      "当社は、利用者が登録、入力、送信、問い合わせ、チャット、決済、閲覧等を行う際に情報を取得します。",
      "また、分析ツール、認証基盤、決済基盤、サーバーログ等を通じて情報を取得する場合があります。",
    ],
  },
  {
    title: "4. 利用目的",
    body: [
      "取得した情報は、以下の目的で利用します。",
      "・本サービスの提供、本人確認、審査、アカウント管理のため",
      "・企業とクリエイターのマッチング、案件進行、連絡、納品確認のため",
      "・料金請求、支払い管理、不正利用防止のため",
      "・問い合わせ対応、トラブル対応、利用者サポートのため",
      "・サービス改善、機能開発、分析、統計作成のため",
      "・規約違反の調査、安全管理、セキュリティ対応のため",
      "・法令対応その他これらに付随する目的のため",
    ],
  },
  {
    title: "5. 第三者提供",
    body: [
      "当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。",
      "ただし、案件進行に必要な範囲で、企業とクリエイターの間で必要情報を共有する場合があります。",
      "また、法令に基づく開示請求、裁判所・行政機関からの正式な要請、生命・身体・財産保護の必要がある場合には、必要な範囲で情報を開示することがあります。",
    ],
  },
  {
    title: "6. 外部委託・外部サービス",
    body: [
      "当社は、業務遂行上必要な範囲で、サーバー、認証、メール送信、決済、分析、サポートその他の外部サービスを利用する場合があります。",
      "その場合、委託先・外部提供先を適切に選定し、必要かつ適切な監督を行います。",
    ],
  },
  {
    title: "7. Cookie等の利用",
    body: [
      "当社は、利便性向上、アクセス解析、不正防止、サービス改善のため、Cookieその他類似技術を利用する場合があります。",
      "利用者は、ブラウザ設定等によりCookieを制御できる場合がありますが、その場合一部機能が利用できなくなることがあります。",
    ],
  },
  {
    title: "8. 安全管理措置",
    body: [
      "当社は、個人情報の漏えい、滅失、毀損、不正アクセス等を防止するため、必要かつ適切な安全管理措置を講じます。",
      "アクセス権限管理、認証管理、ログ管理、委託先管理等を継続的に見直します。",
    ],
  },
  {
    title: "9. 保存期間",
    body: [
      "当社は、利用目的達成に必要な期間、または法令上必要な期間、情報を保存します。",
      "退会後であっても、法令対応、不正防止、紛争対応、監査対応等のために一定期間情報を保持する場合があります。",
    ],
  },
  {
    title: "10. 開示・訂正・削除等",
    body: [
      "利用者は、法令の定めに従い、自己の個人情報について、開示、訂正、追加、削除、利用停止等を求めることができます。",
      "請求を希望する場合は、下記お問い合わせ窓口までご連絡ください。本人確認のうえ、法令に従って対応します。",
    ],
  },
  {
    title: "11. ポリシー変更",
    body: [
      "当社は、法令改正、サービス変更、運営上の必要に応じて本ポリシーを変更することがあります。",
      "重要な変更がある場合は、本サービス上の表示その他適切な方法により通知します。",
    ],
  },
  {
    title: "12. お問い合わせ窓口",
    body: [
      `サービス名：${operator.serviceNameJa}`,
      `運営者：${operator.operatorNameJa}`,
      `お問い合わせ先：${operator.email}`,
    ],
  },
];

const enSections = [
  {
    title: "1. Basic Policy",
    body: [
      "We handle personal information and related data in accordance with applicable privacy laws and regulations.",
      "This Privacy Policy explains how we collect, use, store, and manage information in connection with the Service.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "We may collect the following information:",
      "• name, display name, company name, contact person name",
      "• email address, phone number, address, and other contact information",
      "• login credentials and authentication-related information",
      "• profile information, social account information, follower range, and audience country",
      "• project details, request contents, delivery URLs, chat contents, and reports",
      "• billing-related information (although we may not directly store card numbers or similar data)",
      "• cookies, IP address, device information, browser information, usage history, and access logs",
    ],
  },
  {
    title: "3. How We Collect Information",
    body: [
      "We collect information when users register, submit forms, send messages, make inquiries, chat, complete payments, or browse the Service.",
      "We may also collect information through analytics tools, authentication providers, payment processors, and server logs.",
    ],
  },
  {
    title: "4. Purposes of Use",
    body: [
      "We use collected information for the following purposes:",
      "• to provide the Service, verify identity, conduct screening, and manage accounts",
      "• to support matching, project communication, project execution, and delivery confirmation",
      "• to manage billing, payments, and fraud prevention",
      "• to respond to inquiries, disputes, and support requests",
      "• to improve the Service, develop features, and conduct analytics",
      "• to investigate policy violations, maintain security, and ensure safe operations",
      "• to comply with laws and for related legitimate purposes",
    ],
  },
  {
    title: "5. Sharing with Third Parties",
    body: [
      "We do not provide personal information to third parties without consent except where permitted or required by law.",
      "However, we may share necessary information between companies and creators to the extent required for project execution.",
      "We may also disclose information when legally required, when responding to courts or authorities, or where necessary to protect life, body, or property.",
    ],
  },
  {
    title: "6. Outsourcing and External Services",
    body: [
      "We may use external service providers for hosting, authentication, email delivery, payments, analytics, support, and other business operations.",
      "When doing so, we will select appropriate providers and supervise them as necessary.",
    ],
  },
  {
    title: "7. Cookies and Similar Technologies",
    body: [
      "We may use cookies and similar technologies for convenience, analytics, fraud prevention, and service improvement.",
      "Users may be able to control cookies through browser settings, but some features may become unavailable if cookies are disabled.",
    ],
  },
  {
    title: "8. Security Measures",
    body: [
      "We take necessary and appropriate security measures to prevent leakage, loss, destruction, and unauthorized access to personal information.",
      "We continuously review access control, authentication management, log management, and vendor management.",
    ],
  },
  {
    title: "9. Retention Period",
    body: [
      "We retain information for as long as necessary to fulfill the purposes described above or as required by law.",
      "Even after account deletion, we may retain certain information for legal compliance, fraud prevention, dispute handling, or audit purposes.",
    ],
  },
  {
    title: "10. Access, Correction, and Deletion",
    body: [
      "Users may request access, correction, addition, deletion, or suspension of use of their personal information in accordance with applicable law.",
      "If you would like to make such a request, please contact us using the contact information below. We will respond after appropriate identity verification.",
    ],
  },
  {
    title: "11. Changes to this Policy",
    body: [
      "We may revise this Privacy Policy due to legal changes, service updates, or operational needs.",
      "If important changes are made, we will notify users through the Service or by another appropriate method.",
    ],
  },
  {
    title: "12. Contact",
    body: [
      `Service name: ${operator.serviceNameEn}`,
      `Operator: ${operator.operatorNameEn}`,
      `Contact: ${operator.email}`,
    ],
  },
];

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

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const sections = lang === "ja" ? jaSections : enSections;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">
              {lang === "ja" ? "法務ページ" : "Legal"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {lang === "ja"
                ? `最終更新日：${UPDATED_AT}`
                : `Last updated: ${UPDATED_AT}`}
            </p>
          </div>

          <LanguageTabs lang={lang} setLang={setLang} />
        </div>

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {lang === "ja"
            ? "公開前に、取得情報・外部サービス・問い合わせ先などを実運用に合わせて最終確認してください。"
            : "Before publishing, review the categories of collected data, external services, and contact details so they match your actual operations."}
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 p-6">
              <h2 className="mb-4 text-xl font-semibold">{section.title}</h2>
              <div className="space-y-3 text-sm leading-7 text-slate-700 md:text-base">
                {section.body.map((line, index) => (
                  <p key={`${section.title}-${index}`}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="text-slate-700 underline underline-offset-4">
            {lang === "ja" ? "利用規約" : "Terms of Service"}
          </Link>
          <Link href="/legal" className="text-slate-700 underline underline-offset-4">
            {lang === "ja" ? "特定商取引法に基づく表記" : "Legal Notice"}
          </Link>
          <Link href="/login" className="text-slate-700 underline underline-offset-4">
            {lang === "ja" ? "ログインへ戻る" : "Back to login"}
          </Link>
        </div>
      </div>
    </main>
  );
}