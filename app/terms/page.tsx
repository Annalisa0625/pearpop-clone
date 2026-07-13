//app/terms/page.tsx
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
    title: "1. 本規約について",
    body: [
      "本利用規約は、Trend Mart（以下「本サービス」）の利用条件を定めるものです。",
      "本サービスを利用する企業、クリエイター、その他の利用者は、本規約および当社が別途定めるプライバシーポリシーに同意のうえ、本サービスを利用するものとします。",
    ],
  },
  {
    title: "2. サービス内容",
    body: [
      "本サービスは、企業とクリエイターをつなぐインフルエンサーマッチングサービスです。",
      "現在の主な機能は、クリエイターによる参考条件カードの掲載、企業による依頼送信、承認・拒否、案件内チャット、納品URL提出、完了承認等です。",
      "当社は、必要に応じて本サービスの全部または一部を変更、追加、停止できるものとします。",
    ],
  },
  {
    title: "3. アカウント登録",
    body: [
      "利用者は、登録時に真実、正確かつ最新の情報を提供しなければなりません。",
      "当社は、虚偽登録、なりすまし、反社会的勢力との関係その他当社が不適切と判断する場合、登録を拒否または削除できるものとします。",
      "利用者は、自身のアカウント情報およびログイン情報を適切に管理する責任を負います。",
    ],
  },
  {
    title: "4. 審査と利用制限",
    body: [
      "本サービスでは、企業またはクリエイターに対して審査を行う場合があります。",
      "当社は、未承認状態、規約違反、支払遅延、不正利用、迷惑行為その他運営上の必要がある場合、利用制限、機能制限、停止または退会措置を行うことができます。",
    ],
  },
  {
    title: "5. 案件の成立と当事者関係",
    body: [
      "企業からの依頼に対し、クリエイターが承認した時点で、案件進行の合意が成立します。",
      "個別案件の具体条件（媒体、金額、納期、二次利用、商品内容、投稿条件など）は、案件画面、チャット、関連入力内容等に基づいて判断されます。",
      "当社はプラットフォーム提供者であり、個別案件の当事者ではありません。ただし、運営上必要な範囲で確認、介入、利用制限を行う場合があります。",
    ],
  },
  {
    title: "6. 料金・支払い",
    body: [
      "企業には、当社所定の月額利用料金または将来追加される有料プラン料金が発生する場合があります。",
      "また、案件成立または完了に応じて、別途手数料その他の費用が発生する場合があります。",
      "具体的な料金、支払時期、支払方法は、料金ページ、請求画面、個別契約条件、または別途提示する内容に従います。",
      "一度支払われた料金は、法令上必要な場合または当社が別途認める場合を除き、返金しません。",
    ],
  },
  {
    title: "7. 禁止事項",
    body: [
      "利用者は、以下の行為をしてはなりません。",
      "・虚偽情報の登録、なりすまし、複数アカウントの不正利用",
      "・法令、公序良俗、各プラットフォーム規約に違反する行為",
      "・誹謗中傷、脅迫、差別的言動、迷惑行為",
      "・本サービス外への不正な直接取引誘導、手数料回避行為",
      "・知的財産権、肖像権、プライバシー権その他第三者の権利侵害",
      "・不正アクセス、スクレイピング、リバースエンジニアリング、サービス運営妨害",
      "・当社が不適切と判断する行為",
    ],
  },
  {
    title: "8. 投稿・成果物・権利",
    body: [
      "案件に関連して作成・投稿される成果物、画像、動画、文章等の権利関係は、法令、当事者間の合意、案件条件に従います。",
      "企業が二次利用を希望する場合は、案件条件内で明示し、必要な権利範囲を当事者間で整理するものとします。",
      "利用者は、自らが本サービス上で提供する情報について、必要な権利を有していることを保証するものとします。",
    ],
  },
  {
    title: "9. メッセージ・運営確認",
    body: [
      "当社は、本サービスの安全性維持、不正防止、問い合わせ対応、紛争対応のため、案件情報、チャット、通報内容等を確認する場合があります。",
      "ただし、当社はすべての内容を常時監視する義務を負いません。",
    ],
  },
  {
    title: "10. 免責",
    body: [
      "当社は、本サービスの完全性、正確性、継続性、特定目的適合性、利用結果等を保証しません。",
      "当社は、利用者間の紛争、投稿内容、案件結果、売上、反応、法令適合性等について責任を負いません。ただし、当社に故意または重過失がある場合を除きます。",
      "当社の損害賠償責任が認められる場合でも、当社の責任は、直近3か月間に当該利用者から受領した利用料相当額を上限とします。",
    ],
  },
  {
    title: "11. 退会・アカウント削除",
    body: [
      "利用者は、当社所定の方法により退会を申請できます。",
      "ただし、進行中案件、未払い、調査対応中事項その他未解決事項がある場合、退会処理を保留することがあります。",
    ],
  },
  {
    title: "12. 規約変更",
    body: [
      "当社は、必要に応じて本規約を変更できます。",
      "重要な変更を行う場合は、本サービス上での表示その他当社が適切と判断する方法で周知します。",
      "変更後に本サービスを利用した場合、変更後規約に同意したものとみなします。",
    ],
  },
  {
    title: "13. 準拠法・裁判管轄",
    body: [
      "本規約は日本法に準拠します。",
      "本サービスに関して生じた紛争については、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
  {
    title: "14. 運営者情報",
    body: [
      `サービス名：${operator.serviceNameJa}`,
      `運営者：${operator.operatorNameJa}`,
      `お問い合わせ先：${operator.email}`,
    ],
  },
];

const enSections = [
  {
    title: "1. About these Terms",
    body: [
      "These Terms of Service govern the use of Trendre (the “Service”).",
      "Companies, creators, and all other users must use the Service only after agreeing to these Terms and the Privacy Policy separately provided by us.",
    ],
  },
  {
    title: "2. Scope of the Service",
    body: [
      "The Service is an influencer matching platform connecting companies and creators.",
      "Main functions currently include reference condition cards, direct requests, accept/reject flow, project chat, delivery URL submission, and completion approval.",
      "We may modify, add, suspend, or discontinue all or part of the Service when necessary.",
    ],
  },
  {
    title: "3. Account Registration",
    body: [
      "Users must provide truthful, accurate, and up-to-date information when registering.",
      "We may reject, suspend, or remove registration if we determine that false information, impersonation, anti-social force involvement, or any other inappropriate circumstance exists.",
      "Users are responsible for properly managing their own account and login credentials.",
    ],
  },
  {
    title: "4. Screening and Restrictions",
    body: [
      "We may screen companies and creators before or after registration.",
      "We may limit, suspend, or terminate usage if a user remains unapproved, violates these Terms, delays payment, engages in misconduct, or otherwise causes operational risk.",
    ],
  },
  {
    title: "5. Project Formation and Legal Relationship",
    body: [
      "A project is formed when a creator accepts a request sent by a company.",
      "Specific project conditions such as platform, fee, deadline, secondary usage, product details, and posting conditions are determined based on the project screen, chat, and related submissions.",
      "We provide the platform and are not the direct contractual party to individual projects, although we may intervene when necessary for operational or safety reasons.",
    ],
  },
  {
    title: "6. Fees and Payments",
    body: [
      "Companies may be charged monthly subscription fees or other paid plan fees specified by us.",
      "Additional fees, including transaction fees, may apply depending on project formation or completion.",
      "Specific pricing, payment timing, and payment methods are determined by our pricing page, billing screens, individual conditions, or other notices from us.",
      "Fees already paid are non-refundable unless required by law or expressly approved by us.",
    ],
  },
  {
    title: "7. Prohibited Conduct",
    body: [
      "Users must not engage in any of the following:",
      "• false registration, impersonation, or improper multi-account use",
      "• conduct violating laws, public order, morals, or platform policies",
      "• harassment, threats, discriminatory speech, or nuisance behavior",
      "• off-platform deal diversion or fee avoidance",
      "• infringement of intellectual property, portrait rights, privacy, or other third-party rights",
      "• unauthorized access, scraping, reverse engineering, or service interference",
      "• any other conduct we deem inappropriate",
    ],
  },
  {
    title: "8. Posts, Deliverables, and Rights",
    body: [
      "Rights related to deliverables, images, videos, text, and other project outputs are handled in accordance with law, project conditions, and agreements between the relevant parties.",
      "If a company wishes to use deliverables secondarily, that intention should be clearly indicated within the project conditions.",
      "Users represent that they hold all rights necessary to provide the information or materials they upload to the Service.",
    ],
  },
  {
    title: "9. Messages and Operational Review",
    body: [
      "We may review project details, chats, reports, and related information to maintain safety, prevent fraud, respond to inquiries, and handle disputes.",
      "However, we are not obligated to continuously monitor all communications or content.",
    ],
  },
  {
    title: "10. Disclaimer",
    body: [
      "We do not guarantee completeness, accuracy, continuity, suitability for a specific purpose, or business results from the Service.",
      "We are not responsible for disputes between users, project results, post performance, legal compliance of content, or other outcomes, except where caused by our intentional misconduct or gross negligence.",
      "If we are held liable, our liability will be limited to the amount of fees actually received from the relevant user in the most recent three-month period.",
    ],
  },
  {
    title: "11. Withdrawal and Account Deletion",
    body: [
      "Users may request account withdrawal through the method specified by us.",
      "We may postpone account deletion if there are ongoing projects, unpaid obligations, active investigations, or unresolved issues.",
    ],
  },
  {
    title: "12. Changes to these Terms",
    body: [
      "We may amend these Terms when necessary.",
      "If important changes are made, we will notify users through the Service or by any method we consider appropriate.",
      "Continued use of the Service after such changes will be deemed acceptance of the revised Terms.",
    ],
  },
  {
    title: "13. Governing Law and Jurisdiction",
    body: [
      "These Terms are governed by the laws of Japan.",
      "Any dispute relating to the Service shall be subject to the exclusive jurisdiction of the court having jurisdiction over our principal office as the court of first instance.",
    ],
  },
  {
    title: "14. Operator Information",
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

export default function TermsPage() {
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
              {lang === "ja" ? "利用規約" : "Terms of Service"}
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
            ? "公開前に、運営者名・メールアドレス・所在地・裁判管轄などを実運営に合わせて最終確認してください。"
            : "Before publishing, replace the operator details, contact information, address, and jurisdiction with your actual business information."}
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
          <Link href="/privacy" className="text-slate-700 underline underline-offset-4">
            {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
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