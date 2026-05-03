// app/for-companies/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function ForCompaniesPage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          badge: "For Brands",
          title: "企業向け",
          body:
            "Trendre は、日本・海外ブランドや消費者向け事業者が、日本 / アジア市場向けの施策に合うマイクロクリエイターを探し、参考条件カードを見ながら直接依頼できるサービスです。承認後は案件ページ内でチャット、納品確認、完了承認まで一貫して管理できます。",
          supportLine:
            "日本市場・アジア市場向けのテストマーケや小規模施策を、クリエイター起点で始めたいブランド向けに設計されています。",
          section1Title: "市場に合うクリエイターを探す",
          section1Body:
            "カテゴリ、SNS、主な視聴者、参考条件カードを見ながら、自社の施策に合うクリエイターを探せます。",
          section2Title: "条件を見ながら直接依頼",
          section2Body:
            "希望媒体、予算、納期、依頼内容を入力し、各クリエイターの公開条件を見ながら直接リクエストできます。",
          section3Title: "案件ごとに進行管理",
          section3Body:
            "承認後は案件詳細ページでチャットし、納品URLの確認や完了承認まで一つの流れで進められます。",
          section4Title: "小さく始めやすい",
          section4Body:
            "いきなり大規模な施策を組むのではなく、マイクロクリエイター施策を小さく始めて検証したいブランド向けです。",
          valueTitle: "Trendre が向いている理由",
          value1Title: "テストマーケに向いている",
          value1Body:
            "少人数・小規模から始めて、どんな訴求やクリエイターが合うかを見極めやすい設計です。",
          value2Title: "マイクロクリエイターを探しやすい",
          value2Body:
            "柔軟に動ける日本 / アジアのマイクロクリエイターを見つけて、複数人で試しやすくなります。",
          value3Title: "依頼から納品確認まで一つで管理",
          value3Body:
            "クリエイター探しだけでなく、依頼、チャット、納品確認まで一つの流れで進められます。",
          cta: "企業登録へ",
          billingLink: "料金プランを見る",
        }
      : {
          badge: "For Brands",
          title: "For Brands",
          body:
            "Trendre helps Japanese and global brands and consumer businesses discover Japanese and Asia-based micro creators, review their published rate cards, and send direct requests. After acceptance, communication, delivery review, and completion approval are managed in one place.",
          supportLine:
            "Built for brands running market tests and creator-led campaigns in Japan and Asia.",
          section1Title: "Find creators that fit your market",
          section1Body:
            "Browse creators by category, platform, main audience, and public rate cards to find a strong fit for your campaign.",
          section2Title: "Send direct requests with clear conditions",
          section2Body:
            "Send direct requests with your preferred platform, budget, timeline, and campaign details while reviewing each creator’s published conditions.",
          section3Title: "Manage each project in one place",
          section3Body:
            "After acceptance, keep communication inside the project page and move through delivery review and completion approval in one workflow.",
          section4Title: "Start small and test faster",
          section4Body:
            "Ideal for brands that want to start with smaller creator campaigns before moving into larger-scale marketing efforts.",
          valueTitle: "Why brands use Trendre",
          value1Title: "Built for market testing",
          value1Body:
            "A practical way to test creator-led campaigns before scaling up your marketing budget.",
          value2Title: "Micro creator friendly",
          value2Body:
            "Find flexible Japanese and Asia-based micro creators who are easier to activate for early campaign testing.",
          value3Title: "One clear workflow",
          value3Body:
            "Move from creator discovery to request handling, chat, delivery, and approval in one place.",
          cta: "Go to Brand Signup",
          billingLink: "View pricing",
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
              href="/signup/company-entry"
              className="inline-flex rounded-xl border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {copy.cta}
            </Link>

            <Link
              href="/b/billing"
              className="inline-flex rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {copy.billingLink}
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
            <p className="mt-3 text-sm leading-7 text-gray-600">
              {copy.section4Body}
            </p>
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