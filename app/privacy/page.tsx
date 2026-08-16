"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_UPDATED_AT, SUPPORT_EMAIL } from "@/lib/legal/release";

type Lang = "ja" | "en";
const UPDATED_AT = LEGAL_UPDATED_AT;
type Section = { title: string; body: string[] };
const ja: Section[] = [
  { title: "1. 対象", body: ["本ポリシーは、Creator登録者、Trendre Link Creator、公開Linkの閲覧者、Link問い合わせ送信者、その他のお問い合わせ者に適用されます。"] },
  { title: "2. 取得する情報", body: ["Creatorについて、表示名等のプロフィール、email・認証情報、SNS、フォロワー帯、主な視聴者国、avatar、cover、portfolio、menu、Link、公開slug、問い合わせ関連情報およびアクセス・安全管理情報を取得します。", "Link問い合わせでは、氏名、メールアドレス、会社・ブランド情報、件名、本文、問い合わせ種別、商品・URL・SNS・予算・時期その他フォーム入力、IPアドレス、User-Agent、Referrer、送信・重複防止に関する情報を取得する場合があります。"] },
  { title: "3. 公開情報", body: ["Creatorが公開設定した表示名、avatar、cover、bio、SNS、portfolio、Link item、公開menu・価格等は、インターネット上で閲覧可能になります。公開する内容はCreator自身が選択・管理します。"] },
  { title: "4. 問い合わせ情報の共有", body: ["Link問い合わせで入力された氏名、メールアドレス、会社・ブランド情報、相談内容その他回答・連絡に必要な情報は、送信時の同意に基づき相談先Creatorへ共有します。Creatorは相談への回答・連絡以外の目的でこれらを利用してはなりません。", "IPアドレス、User-Agent、Referrer、送信ID等の安全管理情報は、通常のCreator問い合わせ画面には表示せず、不正利用防止、安全管理、障害対応等のために当社が取り扱います。"] },
  { title: "5. 利用目的", body: ["当社は、Creator profile・Linkの提供と公開、仕事相談の送受信とCreatorへの共有、アカウント管理、support、spam・fraud防止、security、サービス改善、法令対応のために情報を利用します。"] },
  { title: "6. 外部委託・安全管理・保存", body: ["認証、ホスティング、メール送信その他の運営に必要な外部サービスを利用する場合があります。必要かつ適切な安全管理措置を講じ、利用目的の達成または法令対応に必要な期間情報を保存します。"] },
  { title: "7. 開示等の請求", body: ["本人は法令に従い、自己の情報について開示、訂正、削除、利用停止等を請求できます。代表者個人名、住所その他の法定表示事項を常時Web掲載しない場合でも、本人から求められたときは法令に従い遅滞なく対応します。請求はサービス内で案内する正式なお問い合わせ窓口で受け付けます。"] },
  { title: "8. 改定", body: ["本ポリシーは法令、サービス内容または運営上の必要に応じて更新します。重要な変更はサービス上その他適切な方法でお知らせします。"] },
];
const en: Section[] = [
  { title: "1. Scope", body: ["This Policy applies to registered creators, Trendre Link creators, visitors to public Links, Link inquiry senders, and other people who contact us."] },
  { title: "2. Information we collect", body: ["For creators, we collect profile information such as display name, email and authentication data, social accounts, follower range, audience country, avatar, cover, portfolio, menus, Link, public slug, inquiry-related information, and access or security information.", "For Link inquiries, we may collect name, email, company or brand information, subject, message, inquiry type, product, URL, social accounts, budget, timing, other form entries, IP address, User-Agent, Referrer, and submission or anti-duplication information."] },
  { title: "3. Public information", body: ["A creator’s display name, avatar, cover, bio, social accounts, portfolio, Link items, and public menus or prices can be publicly accessible on the internet when selected by the creator."] },
  { title: "4. Sharing inquiry information", body: ["Names, email addresses, company or brand information, inquiry content, and other information needed to reply are shared with the relevant creator based on the sender’s consent. Creators must use this information only to reply or contact the sender about that inquiry.", "IP address, User-Agent, Referrer, submission ID, and similar security information are not shown in the ordinary creator inquiry view and are used by us for abuse prevention, security, and incident response."] },
  { title: "5. Purposes of use", body: ["We use information to provide and publish Creator profiles and Links, receive and share work inquiries, manage accounts, provide support, prevent spam and fraud, maintain security, improve the Service, and comply with law."] },
  { title: "6. Service providers, security, and retention", body: ["We may use providers for authentication, hosting, email delivery, and other operations. We apply appropriate safeguards and retain information for as long as necessary for these purposes or legal compliance."] },
  { title: "7. Requests regarding personal information", body: ["Subject to applicable law, individuals may request access, correction, deletion, or restriction of their own information. Where representative, address, or other statutory information is not continuously published, we will respond without delay as required by law. Requests are accepted through the official contact channel announced in the Service."] },
  { title: "8. Changes", body: ["We may update this Policy for legal, service, or operational reasons. Material changes will be announced through the Service or another appropriate method."] },
];

export default function PrivacyPage() { const [lang, setLang] = useState<Lang>("ja"); const sections = lang === "ja" ? ja : en; return <main className="min-h-screen bg-white text-slate-900"><div className="mx-auto max-w-3xl px-6 py-12 md:px-8"><header className="mb-9 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-medium text-slate-500">Trendre</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}</h1><p className="mt-3 text-sm text-slate-500">{lang === "ja" ? `最終更新日：${UPDATED_AT}` : `Last updated: ${UPDATED_AT}`}</p></div><div className="inline-flex rounded-full border border-slate-200 p-1"><button type="button" onClick={() => setLang("ja")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "ja" ? "bg-slate-900 text-white" : "text-slate-600"}`}>日本語</button><button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1.5 text-sm ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}>English</button></div></header><div className="space-y-7">{sections.map((section) => <section key={section.title} className="rounded-2xl border border-slate-200 p-5 md:p-6"><h2 className="text-lg font-semibold">{section.title}</h2><div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">{section.body.map((line) => <p key={line}>{line}</p>)}</div></section>)}</div><nav className="mt-10 flex flex-wrap gap-4 text-sm"><Link href="/terms" className="underline underline-offset-4">{lang === "ja" ? "利用規約" : "Terms of Service"}</Link><Link href="/legal" className="underline underline-offset-4">{lang === "ja" ? "事業者情報" : "Business information"}</Link></nav></div></main>; }
ja.push({ title: "お問い合わせ", body: [`プライバシーポリシーに関するお問い合わせ、個人情報の開示・訂正・削除・利用停止等の請求は、${SUPPORT_EMAIL}で受け付けます。`] });
en.push({ title: "Contact", body: [`For privacy questions and requests to access, correct, delete, or restrict personal information, contact ${SUPPORT_EMAIL}.`] });
