// app/for-creators/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function ForCreatorsPage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          badge: "For Creators",
          title: "クリエイター向け",
          body:
            "Trendre は、日本・海外ブランドや消費者向け事業者から、日本市場 / アジア市場向けの直接依頼を受けたい日本 / アジアのクリエイター向けのサービスです。自分の参考条件を見せながら案件を受けられます。",
          supportLine:
            "安売り案件に応募するだけでなく、自分の条件を見せたうえで直接依頼を受けたいクリエイター向けに設計されています。",
          section1Title: "参考条件カードを公開",
          section1Body:
            "対応媒体、参考価格、二次利用の可否、補足条件などを、分かりやすい参考条件カードとして公開できます。",
          section2Title: "日本・海外ブランドから直接依頼が届く",
          section2Body:
            "案件一覧に応募するだけではなく、日本・海外ブランドや事業者があなたを見つけて、条件付きで直接依頼できます。",
          section3Title: "案件ページで進行管理",
          section3Body:
            "承認後は案件詳細ページ内でチャットし、納品URL提出から完了承認まで一つの流れで進められます。",
          section4Title: "こんな人に向いています",
          section4Body:
            "・自分の条件を見せたうえで依頼を受けたい\n・安売り案件ばかりに応募したくない\n・日本 / アジア市場向け案件を受けてみたい\n・チャットや納品管理を一つにまとめたい",
          valueTitle: "Trendre が向いている理由",
          value1Title: "自分の条件を先に見せられる",
          value1Body:
            "参考価格や補足条件を出したうえで依頼を受けられるため、条件のすり合わせがしやすくなります。",
          value2Title: "マイクロクリエイターでも始めやすい",
          value2Body:
            "大手クリエイターでなくても、自分に合う案件や小規模施策から始めやすい設計です。",
          value3Title: "進行管理が分かりやすい",
          value3Body:
            "依頼内容、チャット、納品確認が一つの画面にまとまり、案件ごとの流れを追いやすくなります。",
          cta: "クリエイター登録へ",
          secondaryCta: "Homeへ戻る",
        }
      : {
          badge: "For Creators",
          title: "For Creators",
          body:
            "Trendre is built for Japanese and Asia-based creators who want to receive direct requests from Japanese and global brands and consumer businesses running campaigns in Japan and Asia.",
          supportLine:
            "Instead of relying only on open applications, you can publish your own conditions and receive direct requests from brands that fit your work.",
          section1Title: "Publish your rate cards",
          section1Body:
            "Show your platforms, reference pricing, secondary usage preferences, and notes in a clear rate card format.",
          section2Title: "Receive direct requests from brands",
          section2Body:
            "Instead of only applying to campaigns, Japanese and global brands and businesses can discover you and send direct requests based on your published conditions.",
          section3Title: "Manage projects in one place",
          section3Body:
            "After acceptance, keep communication, submission links, and completion approval in one workflow.",
          section4Title: "Best for creators who want to",
          section4Body:
            "• receive requests while showing their own conditions\n• avoid relying only on low-priced open applications\n• work on Japan- or Asia-focused campaigns\n• manage communication and delivery in one place",
          valueTitle: "Why creators use Trendre",
          value1Title: "Show your conditions first",
          value1Body:
            "Publish your reference pricing and working conditions before a brand reaches out.",
          value2Title: "Micro creator friendly",
          value2Body:
            "You do not need to be a major influencer to start receiving relevant requests.",
          value3Title: "Clear project workflow",
          value3Body:
            "Keep requests, chat, delivery, and approval organized in one place.",
          cta: "Go to Creator Signup",
          secondaryCta: "Back to Home",
        };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <section className="rounded-3xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">{copy.badge}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600">
            {copy.body}
          </p>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-gray-500">
            {copy.supportLine}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup/creator-entry"
              className="inline-flex rounded-xl border border-gray-900 bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              {copy.cta}
            </Link>

            <Link
              href="/home"
              className="inline-flex rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.secondaryCta}
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.section1Title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              {copy.section1Body}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.section2Title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              {copy.section2Body}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.section3Title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              {copy.section3Body}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{copy.section4Title}</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
              {copy.section4Body}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">
              {copy.valueTitle}
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border bg-gray-50 p-6">
                <p className="text-lg font-bold">{copy.value1Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.value1Body}
                </p>
              </div>

              <div className="rounded-2xl border bg-blue-50 p-6">
                <p className="text-lg font-bold">{copy.value2Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.value2Body}
                </p>
              </div>

              <div className="rounded-2xl border bg-purple-50 p-6">
                <p className="text-lg font-bold">{copy.value3Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.value3Body}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}