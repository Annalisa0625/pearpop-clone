"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_UPDATED_AT, SUPPORT_EMAIL } from "@/lib/legal/release";

type Lang = "ja" | "en";
type Section = { title: string; body: string[] };

const UPDATED_AT = LEGAL_UPDATED_AT;

const ja: Section[] = [
  {
    title: "1. 本規約について",
    body: [
      "本規約は、Trendre、TrendMartおよびTrendre Link（以下、総称して「本サービス」）の利用条件を定めるものです。利用者は、本規約およびプライバシーポリシーを確認し、同意のうえ本サービスを利用します。",
    ],
  },
  {
    title: "2. 現在提供している機能",
    body: [
      "現在、Creator向けに、アカウント登録、プロフィール・SNS・ポートフォリオ・メニューおよび価格の登録・公開、Trendre Linkの公開ページ、仕事相談の受信、LINE通知連携等の機能を提供しています。",
      "企業向けのMarketplace正式発注・決済・報酬支払機能は順次公開予定です。現時点で表示されるMarketplaceの注文・決済に関する説明や画面イメージは、今後提供予定の機能を含みます。正式発注・決済機能を公開する際は、手数料、支払条件、キャンセル・返金、納品・検収、権利利用条件その他の取引条件を、申込み前に確認できる形で別途表示します。",
      "当社は、Creator登録により仕事、依頼件数、売上、報酬その他の成果が得られることを保証しません。",
    ],
  },
  {
    title: "3. Creator登録とアカウント",
    body: [
      "Creator登録は18歳以上の方に限ります。登録情報は真実かつ最新の内容を入力し、アカウントおよびログイン情報を適切に管理してください。",
      "第三者のアカウントを利用した登録、なりすまし、虚偽情報による登録、または本人の許可なく第三者の氏名・画像・SNSアカウント等を利用することは禁止します。",
    ],
  },
  {
    title: "4. 公開情報・投稿素材・権利",
    body: [
      "Creatorが公開設定した表示名、avatar、bio、SNSリンク、ポートフォリオ、Link item、メニュー・価格等はインターネット上で閲覧できる状態になります。Creatorは公開範囲を理解したうえで情報を登録してください。",
      "Creatorは、本サービスへ登録・公開する文章、画像、動画、ロゴ、SNS情報その他の素材について、必要な権利または許諾を有し、著作権、肖像権、商標権、プライバシーその他の第三者の権利を侵害しないことを保証します。",
      "Creatorが本サービスへ登録した素材の権利は、Creatorまたは正当な権利者に留保されます。ただしCreatorは当社に対し、本サービスの提供、プロフィール・メニュー・Linkの表示、配信、バックアップ、サイズ調整その他これらに付随する技術的処理に必要な範囲で、当該素材を非独占的かつ無償で利用することを許諾します。この許諾は、当社がCreatorの素材を本サービス外の広告案件等へ自由に転用する権利を意味しません。",
    ],
  },
  {
    title: "5. 仕事相談・今後のMarketplace取引",
    body: [
      "Trendre Link等の仕事相談フォームから受け取る氏名、メールアドレス、会社・ブランド情報、相談内容等は、相談への回答・連絡のため相談先Creatorへ共有されます。Creatorはこれらの情報を、当該相談への対応と無関係な営業、spamその他不適切な目的に利用してはなりません。",
      "仕事相談の送信は、契約、正式発注、報酬の支払いその他の取引成立を当然に意味するものではありません。Marketplace正式発注機能の公開後は、各申込み画面に表示される取引条件に従います。",
    ],
  },
  {
    title: "6. LINEその他の外部サービス",
    body: [
      "本サービスは、Google認証、LINE通知その他の外部サービスと連携する場合があります。外部サービスの利用には各提供者の利用条件等が適用される場合があります。",
      "LINE連携は通知を受け取るための任意機能です。当社は、本サービス上で案内した目的の範囲で連携情報を利用します。",
    ],
  },
  {
    title: "7. 禁止事項",
    body: [
      "利用者は、法令・公序良俗・各SNS等の規約に反する行為、虚偽・なりすまし、第三者の権利侵害、嫌がらせ・差別的言動、不正なレビューや実績の表示、spam、スクレイピング、リバースエンジニアリング、不正アクセス、セキュリティ回避、サービス運営の妨害、または当社が合理的に不適切と判断する行為をしてはなりません。",
    ],
  },
  {
    title: "8. 利用制限・退会",
    body: [
      "当社は、虚偽登録、なりすまし、権利侵害、不正利用、本規約違反、セキュリティ上の必要その他運営上相当な理由がある場合、登録拒否、公開停止、機能制限、利用停止またはアカウント削除を行うことがあります。",
      "利用者は当社所定の方法で退会を申し出ることができます。法令対応、不正利用防止、紛争対応その他正当な理由がある場合、必要な情報を一定期間保存することがあります。",
    ],
  },
  {
    title: "9. サービス変更・免責",
    body: [
      "当社は必要に応じて本サービスの内容を変更、追加、停止または終了できます。重要な変更は、可能な範囲で本サービス上その他適切な方法で案内します。",
      "当社は、本サービスの完全性、継続性、特定目的への適合性、仕事の獲得、売上・報酬その他の成果を保証しません。法令で認められる範囲で、利用者間の連絡・相談・公開内容等から生じる損害について責任を負いません。ただし、当社の故意または重過失による場合を除きます。",
    ],
  },
  {
    title: "10. 規約変更・準拠法・管轄",
    body: [
      "当社は、法令、サービス内容または運営上の必要に応じて本規約を変更します。重要な変更は本サービス上その他適切な方法で周知します。",
      "本規約は日本法に準拠し、本サービスに関する紛争は、法令上別段の定めがある場合を除き、当社所在地を管轄する裁判所を第一審の合意管轄裁判所とします。",
    ],
  },
  {
    title: "お問い合わせ",
    body: [
      `利用規約に関するお問い合わせ、サービス利用者サポート、ならびに常時掲載していない事業者情報の開示請求は、${SUPPORT_EMAIL}で受け付けます。`,
    ],
  },
];

const en: Section[] = [
  {
    title: "1. These Terms",
    body: [
      "These Terms govern Trendre, TrendMart, and Trendre Link (collectively, the “Service”). Users must review and agree to these Terms and the Privacy Policy before using the Service.",
    ],
  },
  {
    title: "2. Features currently available",
    body: [
      "We currently provide creator registration, profile, social-account, portfolio, menu and price publishing, public Trendre Link pages, work inquiries, and optional LINE notification linking.",
      "Marketplace ordering, payment, and creator payout features for brands will be released in stages. Current descriptions or screen examples of ordering and payment may include planned features. Before formal ordering or payment is enabled, applicable fees, payment terms, cancellation and refund rules, delivery and acceptance conditions, usage rights, and other transaction terms will be shown before an order is placed.",
      "Creator registration does not guarantee work opportunities, order volume, sales, compensation, or other outcomes.",
    ],
  },
  {
    title: "3. Creator registration and accounts",
    body: [
      "Creator registration is available only to people aged 18 or over. Registration information must be truthful and current, and users are responsible for their accounts and credentials.",
      "Users must not register through another person’s account, impersonate another person, provide false information, or use another person’s name, image, or social account without permission.",
    ],
  },
  {
    title: "4. Public information, uploaded materials, and rights",
    body: [
      "A creator’s display name, avatar, bio, social links, portfolio, Link items, menus, prices, and other information may be publicly accessible on the internet when published by the creator.",
      "Creators represent that they have all rights or permissions required for text, images, videos, logos, social information, and other materials they upload or publish and that those materials do not infringe third-party rights.",
      "Rights in creator materials remain with the creator or lawful rights holder. Creators grant us a non-exclusive, royalty-free license only to the extent necessary to host, display, deliver, back up, resize, and technically process those materials to provide the Service. This does not give us a general right to reuse creator materials for unrelated advertising engagements outside the Service.",
    ],
  },
  {
    title: "5. Work inquiries and future Marketplace transactions",
    body: [
      "Names, email addresses, company or brand information, inquiry content, and other information needed to respond to a work inquiry may be shared with the relevant creator. Creators must not use that information for unrelated sales, spam, or other improper purposes.",
      "Sending a work inquiry does not by itself create a contract, formal order, payment obligation, or other transaction. Once formal Marketplace ordering is enabled, the terms displayed for each transaction will apply.",
    ],
  },
  {
    title: "6. LINE and other external services",
    body: [
      "The Service may integrate with external providers such as Google authentication and LINE notifications. Those providers may apply their own terms.",
      "LINE linking is an optional notification feature. We use linked information only for the purposes described in the Service and our Privacy Policy.",
    ],
  },
  {
    title: "7. Prohibited conduct",
    body: [
      "Users must not violate law, public order, or third-party platform rules; provide false information or impersonate others; infringe rights; harass or discriminate; misrepresent reviews or work history; send spam; scrape; reverse engineer; access systems without authorization; bypass security controls; interfere with the Service; or engage in conduct we reasonably deem improper.",
    ],
  },
  {
    title: "8. Restrictions and withdrawal",
    body: [
      "We may refuse registration, stop publication, limit features, suspend use, or remove an account when reasonably necessary because of false information, impersonation, rights infringement, misuse, violations, security concerns, or other operational reasons.",
      "Users may request withdrawal through our prescribed method. We may retain information for a reasonable period when required for legal compliance, fraud prevention, dispute handling, or another legitimate purpose.",
    ],
  },
  {
    title: "9. Service changes and disclaimer",
    body: [
      "We may modify, add, suspend, or discontinue the Service when necessary and will provide notice of material changes through the Service or another reasonable method where practicable.",
      "We do not guarantee completeness, continuity, fitness for a particular purpose, work opportunities, sales, compensation, or other outcomes. To the extent permitted by law, we are not responsible for loss arising from user communications, inquiries, or public content, except where caused by our intentional misconduct or gross negligence.",
    ],
  },
  {
    title: "10. Changes, governing law, and jurisdiction",
    body: [
      "We may revise these Terms for legal, service, or operational reasons and will announce material changes through the Service or another appropriate method.",
      "These Terms are governed by Japanese law. Except where applicable law requires otherwise, disputes are subject at first instance to the court having jurisdiction over our principal office.",
    ],
  },
  {
    title: "Contact",
    body: [
      `For support, questions about these Terms, and requests for statutory business information not continuously displayed, contact ${SUPPORT_EMAIL}.`,
    ],
  },
];

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const sections = lang === "ja" ? ja : en;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <header className="mb-9 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-slate-500">Trendre</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {lang === "ja" ? "利用規約" : "Terms of Service"}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {lang === "ja" ? `最終更新日：${UPDATED_AT}` : `Last updated: ${UPDATED_AT}`}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 p-1">
            <button type="button" onClick={() => setLang("ja")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "ja" ? "bg-slate-900 text-white" : "text-slate-600"}`}>日本語</button>
            <button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}>English</button>
          </div>
        </header>

        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 p-5 md:p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                {section.body.map((line) => <p key={line}>{line}</p>)}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="underline underline-offset-4">{lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}</Link>
          <Link href="/legal" className="underline underline-offset-4">{lang === "ja" ? "事業者情報" : "Business information"}</Link>
        </nav>
      </div>
    </main>
  );
}
