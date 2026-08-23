"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_UPDATED_AT, SUPPORT_EMAIL } from "@/lib/legal/release";

type Lang = "ja" | "en";
type Section = { title: string; body: string[] };

const UPDATED_AT = LEGAL_UPDATED_AT;

const ja: Section[] = [
  {
    title: "1. 対象",
    body: [
      "本ポリシーは、Trendre、TrendMartおよびTrendre Linkを利用するCreator、公開ページの閲覧者、仕事相談送信者、その他当社へお問い合わせを行う方に適用されます。",
    ],
  },
  {
    title: "2. 取得する情報",
    body: [
      "Creatorについて、表示名、email、認証に必要な情報、性別、生年月日、対応エリア、プロフィール、SNS、フォロワー帯、主な視聴者国、avatar、portfolio、menu・価格、公開slug、仕事相談・案件関連情報、利用履歴、アクセス・安全管理情報等を取得します。パスワードそのものを当社のアプリケーションDBへ保存することはありません。認証情報は認証基盤を通じて取り扱います。",
      "LINE通知を連携した場合、LINEユーザー識別子、表示名、連携状態、通知送信・配信に必要な情報および通知履歴等を取得・利用する場合があります。",
      "Trendre Link等の仕事相談では、氏名、メールアドレス、会社・ブランド情報、件名、本文、問い合わせ種別、商品・URL・SNS・予算・時期その他フォーム入力、IPアドレス、User-Agent、Referrer、送信・重複防止に関する情報を取得する場合があります。",
    ],
  },
  {
    title: "3. 公開情報",
    body: [
      "Creatorが公開設定した表示名、avatar、bio、SNS、portfolio、Link item、公開menu・価格等は、インターネット上で閲覧可能になります。公開する内容はCreator自身が選択・管理します。",
      "生年月日、ログイン用email、認証情報、LINEユーザー識別子その他公開を目的としていない情報は、通常の公開プロフィールには表示しません。",
    ],
  },
  {
    title: "4. 仕事相談情報の共有",
    body: [
      "仕事相談で入力された氏名、メールアドレス、会社・ブランド情報、相談内容その他回答・連絡に必要な情報は、送信時の同意または相談対応に必要な範囲で相談先Creatorへ共有します。Creatorは相談への回答・連絡以外の目的でこれらを利用してはなりません。",
      "IPアドレス、User-Agent、Referrer、送信ID等の安全管理情報は、通常のCreator問い合わせ画面には表示せず、不正利用防止、安全管理、障害対応等のために当社が取り扱います。",
    ],
  },
  {
    title: "5. 利用目的",
    body: [
      "当社は、Creator登録・本人のアカウント管理、プロフィール・menu・Linkの提供と公開、仕事相談の送受信、LINE等による通知、問い合わせ対応、本人確認・不正利用・spam・fraud防止、セキュリティ確保、障害対応、サービス改善、利用状況の分析、法令対応のために情報を利用します。",
      "企業向け正式発注・決済機能を公開した場合は、注文、決済、返金、報酬支払、会計・税務、紛争対応等に必要な情報を、各機能で示す目的の範囲で追加して取り扱うことがあります。",
    ],
  },
  {
    title: "6. 外部サービス・委託先",
    body: [
      "本サービスでは、認証、データベース・ストレージ、ホスティング、メール送信、LINE連携その他の運営に必要な外部サービスを利用し、利用目的の達成に必要な範囲で情報の取扱いを委託する場合があります。委託に際しては、取り扱う情報やリスクに応じて必要かつ適切な安全管理を行います。",
      "Google、LINEその他の外部サービスを利用する場合、各サービス提供者がその利用条件およびプライバシーポリシーに基づいて情報を取り扱う場合があります。",
    ],
  },
  {
    title: "7. 安全管理・保存期間",
    body: [
      "当社は、アクセス制御、認証、権限管理その他、取り扱う情報に応じた合理的な安全管理措置を講じます。",
      "情報は、利用目的の達成、アカウント提供、不正利用防止、問い合わせ・紛争対応、バックアップ、法令上の義務等に必要な期間保存し、不要となった情報は法令および運用上合理的な方法に従って削除または匿名化します。",
    ],
  },
  {
    title: "8. 開示・訂正・削除等の請求",
    body: [
      "本人は、法令に従い、自己の個人情報について開示、訂正、追加、削除、利用停止等を請求できます。本人確認その他法令上必要な手続きをお願いする場合があります。",
      `請求およびプライバシーに関するお問い合わせは、${SUPPORT_EMAIL}で受け付けます。`,
    ],
  },
  {
    title: "9. 改定",
    body: [
      "本ポリシーは、法令、サービス内容、利用する外部サービスまたは運営上の必要に応じて更新します。重要な変更は、本サービス上その他適切な方法でお知らせします。",
    ],
  },
];

const en: Section[] = [
  {
    title: "1. Scope",
    body: [
      "This Policy applies to creators, visitors to public pages, work-inquiry senders, and other people who use or contact Trendre, TrendMart, or Trendre Link.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "For creators, we may collect display name, email, authentication-related information, gender, date of birth, available areas, profile information, social accounts, follower range, audience country, avatar, portfolio, menus and prices, public slug, work-inquiry or job information, usage history, and access or security information. We do not store the creator's raw password in our application database; authentication credentials are handled through our authentication infrastructure.",
      "If LINE notifications are connected, we may process a LINE user identifier, display name, link status, information needed to send notifications, and notification-delivery history.",
      "For Trendre Link or other work inquiries, we may collect name, email, company or brand information, subject, message, inquiry type, product, URL, social accounts, budget, timing, other form entries, IP address, User-Agent, Referrer, and submission or anti-duplication information.",
    ],
  },
  {
    title: "3. Public information",
    body: [
      "A creator’s display name, avatar, bio, social accounts, portfolio, Link items, public menus, prices, and other information selected for publication can be accessible on the internet.",
      "Date of birth, login email, authentication information, LINE user identifiers, and other information not intended for publication are not normally displayed on a public creator profile.",
    ],
  },
  {
    title: "4. Sharing work-inquiry information",
    body: [
      "Names, email addresses, company or brand information, inquiry content, and other information needed to respond may be shared with the relevant creator based on the sender’s consent or as necessary to handle the inquiry. Creators must use this information only to respond or contact the sender about that inquiry.",
      "IP address, User-Agent, Referrer, submission ID, and similar security information are not shown in the ordinary creator inquiry view and are used by us for abuse prevention, security, and incident response.",
    ],
  },
  {
    title: "5. Purposes of use",
    body: [
      "We use information to register and manage creator accounts, provide and publish profiles, menus and Links, receive and share work inquiries, send notifications through LINE or other channels, provide support, verify users when appropriate, prevent misuse, spam and fraud, maintain security, respond to incidents, improve and analyze the Service, and comply with law.",
      "If formal brand ordering and payment features are enabled, we may additionally process information necessary for orders, payments, refunds, creator payouts, accounting, tax compliance, and dispute handling for the purposes disclosed with those features.",
    ],
  },
  {
    title: "6. Service providers and external services",
    body: [
      "We may use service providers for authentication, database and storage, hosting, email delivery, LINE integration, and other operations and entrust information to them only as necessary for the purposes described above. We apply safeguards appropriate to the information and risks involved.",
      "When Google, LINE, or another external service is used, that provider may process information under its own terms and privacy policy.",
    ],
  },
  {
    title: "7. Security and retention",
    body: [
      "We apply reasonable safeguards appropriate to the information we process, including access controls, authentication, and permission management.",
      "We retain information for as long as reasonably necessary to provide accounts and the Service, prevent misuse, handle inquiries or disputes, maintain backups, and meet legal obligations. Information that is no longer required is deleted or anonymized in accordance with applicable law and reasonable operational procedures.",
    ],
  },
  {
    title: "8. Requests regarding personal information",
    body: [
      "Subject to applicable law, individuals may request access, correction, supplementation, deletion, or restriction of their personal information. We may require identity verification or other procedures required by law.",
      `Privacy questions and requests are accepted at ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: "9. Changes",
    body: [
      "We may update this Policy for legal, service, external-provider, or operational reasons. Material changes will be announced through the Service or another appropriate method.",
    ],
  },
];

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const sections = lang === "ja" ? ja : en;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <header className="mb-9 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-slate-500">Trendre</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
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
          <Link href="/terms" className="underline underline-offset-4">{lang === "ja" ? "利用規約" : "Terms of Service"}</Link>
          <Link href="/legal" className="underline underline-offset-4">{lang === "ja" ? "事業者情報" : "Business information"}</Link>
        </nav>
      </div>
    </main>
  );
}
