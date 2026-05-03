// app/home/page.tsx
"use client";

import Link from "next/link";
import { useAppLocale } from "@/lib/i18n/locale";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function HomePage() {
  const { locale } = useAppLocale();

  const copy =
    locale === "ja"
      ? {
          badge: "Japan & Asia Creator Marketplace",
          title:
            "日本・海外ブランドが、日本 / アジアのマイクロクリエイターを見つけて直接依頼できる。",
          body:
            "Trendre は、日本・海外のブランドや消費者向け事業者が、日本 / アジアのマイクロクリエイターを探し、参考条件カードを見ながら直接依頼できるプラットフォームです。依頼、チャット、納品確認まで一つの流れで管理できます。",
          supportLine:
            "日本市場・アジア市場向けのテストマーケや小規模施策を始めたいブランド向けに設計されています。",

          creatorCta: "クリエイター向け",
          companyCta: "企業向け",
          secondaryCta: "ログイン",

          heroCard1Label: "Creator",
          heroCard1Title: "参考条件カードを公開",
          heroCard2Label: "Brand",
          heroCard2Title: "条件を見ながら直接依頼",
          heroCard3Label: "Workflow",
          heroCard3Title: "チャット・納品・完了承認",

          howTitle: "使い方",
          step1Title: "1. クリエイターを探す",
          step1Body:
            "公開プロフィール、対応媒体、主な視聴者、参考条件カードを見ながら、自社に合うクリエイターを探せます。",
          step2Title: "2. 条件を選んで直接依頼",
          step2Body:
            "企業は参考条件カードをもとに、希望媒体、予算、納期、依頼内容を入力して直接リクエストできます。",
          step3Title: "3. 案件進行を一つの流れで管理",
          step3Body:
            "承認後は案件ページ内でチャットし、納品URL提出から完了承認まで一つの画面で進められます。",

          creatorSectionTitle: "クリエイター向け",
          creatorSectionBody:
            "自分の条件を公開し、日本・海外ブランドや事業者から直接依頼を受けたい日本 / アジアのクリエイター向けです。安売り案件に応募するだけでなく、自分の条件を見せたうえで案件を受けられます。",
          creatorLink: "クリエイター向けページを見る",

          companySectionTitle: "企業向け",
          companySectionBody:
            "日本市場・アジア市場向けのテストマーケや小規模施策を進めたい日本・海外ブランド / 事業者向けです。クリエイターを探し、条件を見ながら直接依頼できます。",
          companyLink: "企業向けページを見る",

          valueTitle: "Trendre が向いている理由",
          value1Title: "テストマーケに向いている",
          value1Body:
            "いきなり大規模な施策に進む前に、クリエイター施策を小さく始めて検証できます。",
          value2Title: "マイクロクリエイターを探しやすい",
          value2Body:
            "柔軟に動ける日本 / アジアのマイクロクリエイターを見つけて、複数人で試しやすい設計です。",
          value3Title: "依頼から納品確認まで一つで管理",
          value3Body:
            "候補探しだけでなく、依頼、チャット、納品確認まで一つの流れで進められます。",

          useCaseTitle: "こんなブランド / 事業者に向いています",
          useCase1Title: "美容・スキンケア",
          useCase1Body:
            "新商品や新ブランドの認知拡大を、マイクロクリエイター施策で試したい場合に向いています。",
          useCase2Title: "ファッション・ライフスタイル",
          useCase2Body:
            "複数クリエイターを起用して、投稿の雰囲気や反応を比較しながら検証したい場合に向いています。",
          useCase3Title: "アプリ・サービス・D2C",
          useCase3Body:
            "広告以外の導線として、クリエイター主導の紹介やレビューを試したい場合に向いています。",
        }
      : {
          badge: "Japan & Asia Creator Marketplace",
          title:
            "Discover Japanese and Asia-based micro creators and send direct requests.",
          body:
            "Trendre helps Japanese and global brands discover Japanese and Asia-based micro creators, review their rate cards, and send direct requests. Requests, chat, and delivery review are managed in one workflow.",
          supportLine:
            "Built for brands and consumer businesses running market tests and creator-led campaigns in Japan and Asia.",

          creatorCta: "For Creators",
          companyCta: "For Brands",
          secondaryCta: "Login",

          heroCard1Label: "Creator",
          heroCard1Title: "Publish rate cards",
          heroCard2Label: "Brand",
          heroCard2Title: "Send direct requests",
          heroCard3Label: "Workflow",
          heroCard3Title: "Chat, delivery, and approval",

          howTitle: "How it works",
          step1Title: "1. Browse creator profiles",
          step1Body:
            "Explore creator profiles, platforms, audience fit, and public rate cards to find creators that match your campaign.",
          step2Title: "2. Send direct requests",
          step2Body:
            "Choose a rate card and send a direct request with your preferred platform, budget, timeline, and campaign details.",
          step3Title: "3. Manage delivery in one place",
          step3Body:
            "After acceptance, keep communication, submission links, and completion approval in a single workflow.",

          creatorSectionTitle: "For Creators",
          creatorSectionBody:
            "Built for Japanese and Asia-based creators who want to publish their own conditions and receive direct requests from Japanese and global brands.",
          creatorLink: "View creator page",

          companySectionTitle: "For Brands",
          companySectionBody:
            "Built for Japanese and global brands and consumer businesses that want to discover creators, compare published conditions, and run creator-led campaigns in Japan and Asia.",
          companyLink: "View brand page",

          valueTitle: "Why brands start with Trendre",
          value1Title: "Built for market testing",
          value1Body:
            "Start with smaller creator campaigns before moving into larger-scale marketing efforts.",
          value2Title: "Micro creator friendly",
          value2Body:
            "Find flexible Japanese and Asia-based micro creators who are easier to activate for early campaign testing.",
          value3Title: "One clear workflow",
          value3Body:
            "Move from creator discovery to request handling, chat, delivery, and approval in one place.",

          useCaseTitle: "Who Trendre is for",
          useCase1Title: "Beauty and skincare brands",
          useCase1Body:
            "Ideal for testing new products and early brand awareness campaigns with creator-led content.",
          useCase2Title: "Fashion and lifestyle brands",
          useCase2Body:
            "Useful for working with multiple creators and comparing content style, reactions, and audience fit.",
          useCase3Title: "Apps, services, and D2C brands",
          useCase3Body:
            "A practical way to test creator-led promotion, reviews, and product discovery beyond paid ads.",
        };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <main>
        <section className="border-b bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {copy.badge}
              </p>

              <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                {copy.title}
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-gray-600 md:text-lg">
                {copy.body}
              </p>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-gray-500 md:text-base">
                {copy.supportLine}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/for-creators"
                  className="rounded-xl border border-gray-900 bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {copy.creatorCta}
                </Link>

                <Link
                  href="/for-companies"
                  className="rounded-xl border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {copy.companyCta}
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 shadow-sm">
              <div className="grid gap-4">
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-sm font-semibold text-gray-500">
                    {copy.heroCard1Label}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {copy.heroCard1Title}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-sm font-semibold text-gray-500">
                    {copy.heroCard2Label}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {copy.heroCard2Title}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-sm font-semibold text-gray-500">
                    {copy.heroCard3Label}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {copy.heroCard3Title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight">{copy.howTitle}</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-600">STEP 1</p>
              <h3 className="mt-3 text-xl font-bold">{copy.step1Title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {copy.step1Body}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-600">STEP 2</p>
              <h3 className="mt-3 text-xl font-bold">{copy.step2Title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {copy.step2Body}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-600">STEP 3</p>
              <h3 className="mt-3 text-xl font-bold">{copy.step3Title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {copy.step3Body}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold">{copy.creatorSectionTitle}</h3>
              <p className="mt-4 text-sm leading-7 text-gray-600">
                {copy.creatorSectionBody}
              </p>
              <Link
                href="/for-creators"
                className="mt-6 inline-flex text-sm font-semibold text-blue-600 underline underline-offset-4"
              >
                {copy.creatorLink}
              </Link>
            </div>

            <div className="rounded-3xl border bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold">{copy.companySectionTitle}</h3>
              <p className="mt-4 text-sm leading-7 text-gray-600">
                {copy.companySectionBody}
              </p>
              <Link
                href="/for-companies"
                className="mt-6 inline-flex text-sm font-semibold text-blue-600 underline underline-offset-4"
              >
                {copy.companyLink}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">{copy.valueTitle}</h2>

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

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight">
              {copy.useCaseTitle}
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-6">
                <p className="text-lg font-bold">{copy.useCase1Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.useCase1Body}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-6">
                <p className="text-lg font-bold">{copy.useCase2Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.useCase2Body}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-6">
                <p className="text-lg font-bold">{copy.useCase3Title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {copy.useCase3Body}
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