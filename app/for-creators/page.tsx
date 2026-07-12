import Image from "next/image";
import Link from "next/link";

const featureCards = [
  {
    icon: "🧾",
    title: "メニューを公開",
    description:
      "Instagram投稿、リール、TikTok動画、UGC制作など、受けたい内容と価格を登録できます。",
  },
  {
    icon: "✅",
    title: "注文を確認して受ける",
    description:
      "依頼内容・条件・報酬を見てから承認できます。合わない依頼を無理に受ける必要はありません。",
  },
  {
    icon: "💬",
    title: "チャットで相談",
    description:
      "来店日、投稿条件、撮影ルールなど、不明点を事前に確認できます。",
  },
  {
    icon: "¥",
    title: "納品と報酬を管理",
    description:
      "納品URLの提出、完了案件、報酬履歴までTrendre上でまとめて確認できます。",
  },
];

const genreCards = [
  {
    emoji: "💄",
    title: "美容液レビュー",
    type: "Instagramリール",
    price: "¥30,000",
    bg: "bg-rose-50",
  },
  {
    emoji: "☕",
    title: "新作カフェPR",
    type: "来店体験",
    price: "¥15,000",
    bg: "bg-amber-50",
  },
  {
    emoji: "✈️",
    title: "旅館・ホテル宿泊",
    type: "YouTube動画",
    price: "¥80,000",
    bg: "bg-sky-50",
  },
  {
    emoji: "👗",
    title: "ファッションコーデ",
    type: "Instagram投稿",
    price: "¥22,000",
    bg: "bg-violet-50",
  },
  {
    emoji: "🏋️",
    title: "ジム体験レポート",
    type: "TikTok動画",
    price: "¥18,000",
    bg: "bg-emerald-50",
  },
  {
    emoji: "🏪",
    title: "店舗PRレポート",
    type: "Instagram Stories",
    price: "¥12,000",
    bg: "bg-orange-50",
  },
  {
    emoji: "📦",
    title: "D2C商品レビュー",
    type: "UGC制作",
    price: "¥45,000",
    bg: "bg-pink-50",
  },
  {
    emoji: "🎬",
    title: "企業UGC撮影",
    type: "動画・写真セット",
    price: "¥60,000",
    bg: "bg-blue-50",
  },
];

const steps = [
  {
    step: "STEP 1",
    title: "無料登録",
    description: "メールアドレスなどを入力して、Trendreアカウントを作成します。",
    screenTitle: "無料登録",
    items: ["メールアドレス", "パスワード", "登録する"],
  },
  {
    step: "STEP 2",
    title: "プロフィールとSNSを登録",
    description:
      "写真、ジャンル、対応エリア、SNSアカウント、ポートフォリオを整えます。",
    screenTitle: "SNS連携",
    items: ["Instagram", "TikTok", "YouTube"],
  },
  {
    step: "STEP 3",
    title: "メニューと価格を設定",
    description:
      "PR投稿、UGC制作、来店体験など、受けたい内容と価格を公開します。",
    screenTitle: "メニュー設定",
    items: ["Instagramリール　¥35,000", "UGC制作　¥50,000", "来店体験　¥18,000"],
  },
  {
    step: "STEP 4",
    title: "注文を受けて納品",
    description:
      "届いた注文を確認し、チャットで相談して、投稿URLや納品URLを提出します。",
    screenTitle: "納品完了",
    items: ["報酬確定　¥35,000", "次の案件へ", "履歴を見る"],
  },
];

const points = [
  {
    number: "POINT. 1",
    title: "受ける案件は自分で選べる",
    body: "届いた注文は、内容・条件・報酬を見てから判断できます。",
  },
  {
    number: "POINT. 2",
    title: "価格は自分で自由に設定",
    body: "投稿、リール、UGC制作、来店体験など、メニューごとに価格を決められます。",
  },
  {
    number: "POINT. 3",
    title: "チャットで事前確認できる",
    body: "来店日、撮影ルール、投稿条件などを依頼主と事前に相談できます。",
  },
  {
    number: "POINT. 4",
    title: "納品・報酬履歴を一元管理",
    body: "納品URLの提出、完了案件、報酬履歴までまとめて確認できます。",
  },
];

function PhoneMock({
  title,
  items,
  highlightIndex,
}: {
  title: string;
  items: string[];
  highlightIndex: number;
}) {
  return (
    <div className="mx-auto w-[150px] rounded-[26px] border-[4px] border-slate-950 bg-white px-3 py-4 shadow-[0_18px_38px_rgba(15,23,42,0.14)] sm:w-[176px]">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
      <p className="mb-3 text-center text-xs font-black text-rose-500">
        {title}
      </p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item}
            className={`rounded-full px-3 py-2 text-xs font-bold leading-5 ${
              index === highlightIndex
                ? "bg-rose-500 text-white"
                : "bg-rose-50 text-slate-700"
            }`}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-200" />
    </div>
  );
}

export default function ForCreatorsPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfc] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              width={126}
              height={34}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ログイン
            </Link>
            <Link
              href="/signup/creator"
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_28px_rgba(244,63,94,0.22)] transition hover:bg-rose-600"
            >
              無料登録
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12">
        <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:rounded-[36px]">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.10),transparent_42%),radial-gradient(circle_at_top_left,rgba(244,63,94,0.06),transparent_35%)] px-5 pb-6 pt-5 sm:px-9 sm:py-10">
            <div className="grid items-center gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-rose-100 bg-white/80 px-3 py-1 text-[10px] font-black tracking-[0.24em] text-rose-500">
                  TRENDRE
                </div>

                <h1 className="text-[2.1rem] font-black leading-[1.13] tracking-tight sm:text-[3.4rem] lg:text-[4rem]">
                  Trendreと共に
                  <br />
                  <span className="text-rose-500">次のトレンド</span>を
                  <br className="sm:hidden" />
                  発掘しましょう
                </h1>

                <p className="mt-4 max-w-xl text-[14px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
                  Instagram・TikTokなどでPR投稿やUGC制作を受けたい人向けのサービスです。
                  プロフィールとメニューを登録すると、依頼主から注文を受けられます。
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg">
                  {["価格を決める", "注文を選ぶ", "報酬を管理"].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-200 bg-white/85 px-2 py-3 text-center text-[12px] font-black leading-5 text-slate-700 shadow-sm"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup/creator"
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_32px_rgba(244,63,94,0.24)] transition hover:bg-rose-600 sm:text-base"
                  >
                    無料でインフルエンサー登録
                  </Link>
                  <a
                    href="#flow"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-800 transition hover:bg-slate-50 sm:text-base"
                  >
                    案件の流れを見る
                  </a>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[390px] sm:max-w-[460px]">
                <div className="relative overflow-hidden rounded-[28px] border border-rose-100 bg-white p-3 shadow-[0_24px_55px_rgba(15,23,42,0.08)] sm:p-4">
                  <div className="absolute left-4 top-4 z-10 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
                    <p className="text-[11px] font-bold text-slate-400">
                      新しい注文
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      美容液レビュー
                    </p>
                    <p className="mt-1 text-sm font-black text-rose-500">
                      ¥30,000
                    </p>
                  </div>

                  <div className="absolute bottom-5 right-5 z-10 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_14px_35px_rgba(15,23,42,0.2)]">
                    <p className="text-[11px] font-bold text-slate-300">
                      今月の報酬
                    </p>
                    <p className="text-xl font-black">¥93,335</p>
                  </div>

                  <div className="max-h-[360px] overflow-hidden rounded-[24px] bg-white sm:max-h-[430px]">
                    <Image
                      src="/brand/trendre-home-hero.png"
                      alt="TrendreでPR案件を受けるイメージ"
                      width={1122}
                      height={1402}
                      className="h-auto w-full"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.6rem]">
            PRの受注を、もっと分かりやすく。
          </h2>
          <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
            注文内容、チャット、納品URL、報酬履歴をTrendre上で整理できます。
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.045)]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
                {card.icon}
              </div>
              <h3 className="text-[1.2rem] font-black tracking-tight">
                {card.title}
              </h3>
              <p className="mt-2 text-[14px] font-semibold leading-7 text-slate-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[30px] bg-white px-5 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
              幅広いジャンルのPR案件に出会えます
            </h2>
            <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
              美容、グルメ、旅行、ファッション、店舗PR、D2C商品、UGC制作など、
              あなたの発信ジャンルに合った依頼を受けられます。
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {genreCards.map((card) => (
              <div
                key={card.title}
                className={`${card.bg} rounded-[26px] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]`}
              >
                <div className="text-[26px]">{card.emoji}</div>
                <h3 className="mt-4 text-[1.1rem] font-black tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-sm font-semibold text-slate-600">
                  {card.type}
                </p>
                <p className="mt-4 text-[1.45rem] font-black text-rose-500">
                  {card.price}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs font-semibold leading-6 text-slate-400 sm:text-sm">
            ※ 掲載価格は参考例です。価格はインフルエンサーが自由に設定できます。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[30px] bg-white px-5 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10">
          <div className="grid items-center gap-7 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.45rem]">
                依頼主はあなたのプロフィールを見て注文します
              </h2>
              <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
                SNS種別、カテゴリ、価格帯、地域、メニュー内容などで条件を絞り込みながら、
                ブランドに合う依頼先を探します。
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {["SNS別に検索", "価格付きで比較", "地域で絞り込み", "メニューを確認"].map(
                  (pill) => (
                    <div
                      key={pill}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 sm:text-sm"
                    >
                      {pill}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-[#fcfcfd] p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="overflow-hidden rounded-[20px] bg-white">
                <Image
                  src="/brand/trendre-search-preview.jpg"
                  alt="依頼主向けの検索画面プレビュー"
                  width={1024}
                  height={577}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
            かんたん4ステップで始められます
          </h2>
          <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
            プロフィールとメニューを整えるだけで、注文を受けられる状態になります。
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-7"
            >
              <div className="grid items-center gap-7 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="mb-4 inline-flex rounded-2xl bg-rose-500 px-4 py-3 text-xs font-black text-white shadow-[0_12px_24px_rgba(244,63,94,0.22)]">
                    {step.step}
                  </div>
                  <h3 className="text-[1.55rem] font-black tracking-tight sm:text-[2rem]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[16px] sm:leading-8">
                    {step.description}
                  </p>
                </div>

                <PhoneMock
                  title={step.screenTitle}
                  items={step.items}
                  highlightIndex={index === 3 ? 0 : step.items.length - 1}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 bg-rose-500 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
              安心して使えるポイント
            </h2>
            <p className="mt-3 text-[14px] font-semibold leading-7 text-rose-50 sm:text-[17px] sm:leading-8">
              自分で案件を選び、価格を決め、事前確認しながら進められます。
            </p>
          </div>

          <div className="mt-7 space-y-4">
            {points.map((point) => (
              <details
                key={point.title}
                className="group rounded-[26px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:px-7"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.22em] text-rose-500">
                      {point.number}
                    </p>
                    <h3 className="mt-2 text-[1.25rem] font-black tracking-tight text-slate-950 sm:text-[1.45rem]">
                      {point.title}
                    </h3>
                  </div>
                  <span className="text-xl font-black text-rose-400 transition group-open:rotate-180">
                    ˅
                  </span>
                </summary>
                <p className="pt-4 text-[14px] font-semibold leading-7 text-slate-600 sm:text-[16px] sm:leading-8">
                  {point.body}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-[34px] bg-[#020b2b] px-6 py-10 text-white shadow-[0_28px_64px_rgba(2,6,23,0.24)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[1.8rem] font-black leading-tight tracking-tight sm:text-[2.8rem]">
              プロフィールとメニューを整えて、
              <br />
              <span className="text-rose-400">PR案件を受けられる状態に。</span>
            </h2>

            <p className="mt-4 text-[14px] font-semibold leading-7 text-slate-200 sm:text-[17px] sm:leading-8">
              まずは無料登録して、SNS・ポートフォリオ・メニューを追加しましょう。
            </p>

            <div className="mt-7">
              <Link
                href="/signup/creator"
                className="inline-flex w-full max-w-[320px] items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-slate-950 transition hover:bg-slate-100"
              >
                無料でインフルエンサー登録
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-300 sm:text-sm">
              <span>登録無料</span>
              <span>自分で価格設定</span>
              <span>注文は確認してから承認</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <Image
                src="/brand/trendre-logo-full.png"
                alt="Trendre"
                width={126}
                height={34}
                className="h-8 w-auto"
              />
              <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-slate-600">
                Trendreは、日本企業と日本のインフルエンサーをつなぐPR・UGC制作の受注型マーケットプレイスです。
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-950">サービス</h3>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <Link href="/" className="block hover:text-slate-950">
                  企業向け
                </Link>
                <Link href="/search" className="block hover:text-slate-950">
                  インフルエンサー検索
                </Link>
                <Link href="/login" className="block hover:text-slate-950">
                  ログイン
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-950">ポリシー</h3>
              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <Link href="/terms" className="block hover:text-slate-950">
                  利用規約
                </Link>
                <Link href="/privacy" className="block hover:text-slate-950">
                  プライバシーポリシー
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}