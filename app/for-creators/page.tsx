import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "インフルエンサー登録 | Trendre",
  description:
    "Trendreは、PR投稿やUGC制作の依頼をスマホで受けられるインフルエンサー向けマーケットプレイスです。",
};

const jobExamples = [
  {
    icon: "💄",
    title: "美容液レビュー",
    type: "Instagramリール",
    price: "¥30,000",
    bg: "bg-rose-50",
  },
  {
    icon: "☕",
    title: "新作カフェPR",
    type: "来店体験",
    price: "¥15,000",
    bg: "bg-amber-50",
  },
  {
    icon: "✈️",
    title: "旅館・ホテル宿泊",
    type: "YouTube動画",
    price: "¥80,000",
    bg: "bg-sky-50",
  },
  {
    icon: "👗",
    title: "ファッションコーデ",
    type: "Instagram投稿",
    price: "¥22,000",
    bg: "bg-violet-50",
  },
  {
    icon: "🏋️",
    title: "ジム体験レポート",
    type: "TikTok動画",
    price: "¥18,000",
    bg: "bg-emerald-50",
  },
  {
    icon: "🏪",
    title: "店舗PRレポート",
    type: "Instagram Stories",
    price: "¥12,000",
    bg: "bg-orange-50",
  },
  {
    icon: "📦",
    title: "D2C商品レビュー",
    type: "UGC制作",
    price: "¥45,000",
    bg: "bg-pink-50",
  },
  {
    icon: "🎬",
    title: "企業UGC撮影",
    type: "動画・写真セット",
    price: "¥60,000",
    bg: "bg-blue-50",
  },
];

const featureCards = [
  {
    icon: "🧾",
    title: "メニューを公開",
    body: "Instagram投稿、リール、TikTok動画、UGC制作など、自分が受けたい内容と価格を登録できます。",
  },
  {
    icon: "✅",
    title: "注文を確認して受ける",
    body: "企業から注文が届いたら、内容・条件・報酬を確認してから承認できます。",
  },
  {
    icon: "💬",
    title: "チャットで相談",
    body: "来店日、投稿条件、撮影ルールなど、不明点をチャットで事前に確認できます。",
  },
  {
    icon: "¥",
    title: "納品と報酬を管理",
    body: "投稿URLや納品URLを提出し、完了した案件の報酬履歴もまとめて確認できます。",
  },
];

const steps = [
  {
    step: "STEP 1",
    title: "無料登録",
    body: "メールアドレスなどを入力して、Trendreアカウントを作成します。",
    mockTitle: "無料登録",
    lines: ["メールアドレス", "パスワード", "登録する"],
  },
  {
    step: "STEP 2",
    title: "プロフィールとSNSを登録",
    body: "写真、ジャンル、対応エリア、SNSアカウント、ポートフォリオを整えます。",
    mockTitle: "SNS連携",
    lines: ["Instagram", "TikTok", "YouTube"],
  },
  {
    step: "STEP 3",
    title: "メニューと価格を設定",
    body: "PR投稿、UGC制作、来店体験など、受けたい内容と価格を自分で公開します。",
    mockTitle: "メニュー設定",
    lines: ["Instagramリール　¥35,000", "UGC制作　¥50,000", "来店体験　¥18,000"],
  },
  {
    step: "STEP 4",
    title: "注文を受けて納品",
    body: "企業から届いた注文を確認し、チャットで相談して、投稿URLや納品URLを提出します。",
    mockTitle: "納品完了",
    lines: ["報酬確定", "¥35,000", "次の案件へ"],
  },
];

export default function ForCreatorsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:pt-12">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white via-rose-50/60 to-white px-6 py-12 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-rose-100 sm:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-16 lg:py-16">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#fb7185_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative z-10">
            <p className="mb-4 text-sm font-bold tracking-[0.18em] text-rose-500">
              TRENDRE FOR INFLUENCERS
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              PR案件を、
              <br />
              スマホで受ける。
              <br />
              <span className="text-rose-500">価格を決めて、</span>
              <br />
              自分のペースで働ける。
            </h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-700 sm:text-lg">
              Trendreは、Instagram・TikTokなどでPR投稿やUGC制作を受けたい
              インフルエンサー向けのマーケットプレイスです。プロフィール、SNS、
              メニューを登録すると、企業から依頼を受けられます。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-14 items-center justify-center rounded-full bg-rose-500 px-8 text-base font-bold text-white shadow-[0_16px_30px_rgba(244,63,94,0.28)] transition hover:bg-rose-600"
              >
                無料でインフルエンサー登録
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-base font-bold text-slate-900 transition hover:bg-slate-50"
              >
                案件の流れを見る
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-bold text-slate-700">
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                自分で価格設定
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                注文は確認制
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                報酬まで管理
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 lg:mt-0">
            <div className="relative mx-auto max-w-md rounded-[2rem] bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-100">
              <Image
                src="/brand/trendre-home-hero.png"
                alt="TrendreでPR案件を受けるインフルエンサー"
                width={1122}
                height={1402}
                priority
                className="mx-auto h-[430px] w-auto object-contain sm:h-[520px]"
              />

              <div className="absolute left-5 top-6 rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-slate-100">
                <p className="text-xs font-bold text-slate-400">新しい注文</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  美容液レビュー
                </p>
                <p className="mt-1 text-sm font-bold text-rose-500">¥30,000</p>
              </div>

              <div className="absolute bottom-8 right-5 rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-xl">
                <p className="text-xs font-bold text-slate-300">今月の報酬</p>
                <p className="mt-1 text-2xl font-black">¥93,335</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            PRの受注を、もっと分かりやすく。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
            注文内容、チャット、納品URL、報酬履歴をTrendre上で整理できます。
            受けたい内容と価格をメニューとして公開し、企業からの注文を待つことができます。
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[2rem] bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-950">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            幅広いジャンルのPR案件に出会えます
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
            美容、グルメ、旅行、ファッション、店舗PR、D2C商品、UGC制作など、
            あなたの発信ジャンルに合った依頼を受けられます。
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jobExamples.map((job) => (
            <div
              key={job.title}
              className={`${job.bg} rounded-[1.75rem] p-6 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]`}
            >
              <div className="text-3xl">{job.icon}</div>
              <h3 className="mt-5 text-xl font-black text-slate-950">
                {job.title}
              </h3>
              <p className="mt-2 text-base font-medium text-slate-600">
                {job.type}
              </p>
              <p className="mt-4 text-xl font-black text-rose-500">
                {job.price}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm font-medium text-slate-400">
          ※ 掲載価格は参考例です。価格はインフルエンサーが自由に設定できます。
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-slate-50 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 sm:p-10 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold tracking-[0.18em] text-rose-500">
              SEARCH PREVIEW
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              企業はこのように
              <br />
              インフルエンサーを探します
            </h2>
            <p className="mt-5 text-base font-medium leading-8 text-slate-600">
              企業は、SNS種別、カテゴリ、価格帯、地域、メニュー内容などで条件を絞り込みながら、
              ブランドに合う依頼先を探します。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["SNS別に検索", "価格付きで比較", "地域で絞り込み", "メニューを確認"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-100"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 lg:mt-0">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-3 flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                trendre.jp/search
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {["SNS: Instagram", "カテゴリ: 美容・コスメ", "価格帯: 〜¥50,000", "地域: 東京都"].map(
                (filter) => (
                  <span
                    key={filter}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-500"
                  >
                    {filter}
                  </span>
                )
              )}
            </div>

            <p className="mt-5 text-sm font-bold text-slate-400">
              246件のインフルエンサーが見つかりました
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Yuki S.", "12.4万", "美容", "¥35,000〜"],
                ["Haruto K.", "8.2万", "グルメ", "¥28,000〜"],
                ["Mia T.", "24.1万", "ファッション", "¥55,000〜"],
                ["Ren O.", "6.8万", "ライフ", "¥22,000〜"],
              ].map(([name, followers, category, price]) => (
                <div
                  key={name}
                  className="rounded-3xl border border-rose-100 bg-white p-5"
                >
                  <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-rose-100 to-orange-100" />
                  <p className="mt-4 text-center text-base font-black text-slate-950">
                    {name}
                  </p>
                  <p className="text-center text-sm font-medium text-slate-400">
                    {followers}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <span className="rounded-full bg-rose-500 px-2 py-1 text-xs font-bold text-white">
                      IG
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      {category}
                    </span>
                  </div>
                  <p className="mt-3 text-center text-base font-black text-rose-500">
                    {price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            かんたん4ステップで
            <br />
            すぐに始められます
          </h2>
        </div>

        <div className="relative mt-14 space-y-16">
          <div className="absolute left-7 top-0 h-full border-l-2 border-dashed border-rose-300 sm:left-10" />

          {steps.map((step) => (
            <div key={step.step} className="relative grid gap-8 sm:grid-cols-[100px_1fr]">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500 text-center text-sm font-black leading-tight text-white shadow-[0_14px_30px_rgba(244,63,94,0.24)] sm:h-20 sm:w-20">
                {step.step.replace(" ", "\n")}
              </div>

              <div className="grid gap-8 rounded-[2rem] bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 md:grid-cols-[1fr_260px] md:items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base font-medium leading-8 text-slate-600">
                    {step.body}
                  </p>
                </div>

                <div className="mx-auto w-[210px] rounded-[2rem] border-[6px] border-slate-900 bg-white p-4 shadow-xl">
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
                  <p className="text-center text-sm font-black text-rose-500">
                    {step.mockTitle}
                  </p>
                  <div className="mt-5 space-y-3">
                    {step.lines.map((line, index) => (
                      <div
                        key={line}
                        className={`rounded-full px-4 py-3 text-sm font-bold ${
                          index === step.lines.length - 1
                            ? "bg-rose-500 text-white"
                            : "bg-rose-50 text-slate-700"
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto mt-5 h-1 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-rose-500 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-5">
          {[
            ["POINT. 1", "受ける案件は自分で選べる"],
            ["POINT. 2", "価格は自分で自由に設定"],
            ["POINT. 3", "チャットで事前確認できる"],
            ["POINT. 4", "納品・報酬履歴を一元管理"],
          ].map(([point, title]) => (
            <div
              key={point}
              className="flex items-center justify-between rounded-3xl bg-white px-6 py-6 shadow-[0_18px_40px_rgba(136,19,55,0.16)]"
            >
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-rose-500">
                  {point}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {title}
                </h3>
              </div>
              <span className="text-2xl font-light text-rose-400">⌄</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <div className="rounded-[2.5rem] bg-slate-950 px-6 py-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-10">
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            プロフィールとメニューを整えるだけで、
            <br />
            <span className="text-rose-400">PR案件を受けられる状態に。</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-slate-300">
            まずは無料登録して、SNS・ポートフォリオ・メニューを追加しましょう。
            あなたの発信に合う企業からの依頼を受けられるようになります。
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-10 text-base font-black text-slate-950 transition hover:bg-slate-100"
            >
              無料でインフルエンサー登録
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm font-bold text-slate-400">
            <span>登録無料</span>
            <span>自分で価格設定</span>
            <span>注文は確認してから承認</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/home" className="flex items-center">
          <Image
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 md:flex">
          <Link href="/home" className="hover:text-rose-500">
            企業向け
          </Link>
          <Link href="/b/creators" className="hover:text-rose-500">
            インフルエンサー検索
          </Link>
          <Link href="/login" className="hover:text-rose-500">
            ログイン
          </Link>
        </nav>

        <Link
          href="/signup"
          className="rounded-full bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_25px_rgba(244,63,94,0.22)] transition hover:bg-rose-600"
        >
          無料登録
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Image
            src="/brand/trendre-logo-full.png"
            alt="Trendre"
            width={120}
            height={40}
            className="h-8 w-auto"
          />
          <p className="mt-4 max-w-sm text-sm font-medium leading-7 text-slate-500">
            Trendreは、日本企業と日本のインフルエンサーをつなぐPR・UGC制作の受注型マーケットプレイスです。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm font-bold text-slate-700">
          <div className="space-y-3">
            <p className="text-slate-950">サービス</p>
            <Link href="/home" className="block text-slate-500 hover:text-rose-500">
              企業向け
            </Link>
            <Link href="/b/creators" className="block text-slate-500 hover:text-rose-500">
              インフルエンサー検索
            </Link>
            <Link href="/login" className="block text-slate-500 hover:text-rose-500">
              ログイン
            </Link>
          </div>
          <div className="space-y-3">
            <p className="text-slate-950">ポリシー</p>
            <Link href="/terms" className="block text-slate-500 hover:text-rose-500">
              利用規約
            </Link>
            <Link href="/privacy" className="block text-slate-500 hover:text-rose-500">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}