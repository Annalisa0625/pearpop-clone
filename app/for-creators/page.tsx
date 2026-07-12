import Image from "next/image";
import Link from "next/link";

const featureCards = [
  {
    icon: "🧾",
    title: "メニューを公開",
    description:
      "Instagram投稿、リール、TikTok動画、UGC制作など、受けたい内容と価格を自分で登録できます。",
  },
  {
    icon: "✅",
    title: "注文を確認して受ける",
    description:
      "依頼内容・条件・報酬を確認してから承認できます。自分に合う案件だけ選べます。",
  },
  {
    icon: "💬",
    title: "チャットで事前確認",
    description:
      "来店日、投稿条件、撮影ルールなど、不明点はチャットで事前に確認できます。",
  },
  {
    icon: "¥",
    title: "納品と報酬を管理",
    description:
      "投稿URLや納品URLを提出し、完了した案件の報酬履歴までまとめて確認できます。",
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
    description:
      "メールアドレスなどを入力して、Trendreアカウントを作成します。",
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
      "PR投稿、UGC制作、来店体験など、受けたい内容と価格を自分で公開します。",
    screenTitle: "メニュー設定",
    items: ["Instagramリール　¥35,000", "UGC制作　¥50,000", "来店体験　¥18,000"],
  },
  {
    step: "STEP 4",
    title: "注文を受けて納品",
    description:
      "依頼主から届いた注文を確認し、チャットで相談して、投稿URLや納品URLを提出します。",
    screenTitle: "納品完了",
    items: ["報酬確定　¥35,000", "次の案件へ", "履歴を見る"],
  },
];

const points = [
  {
    number: "POINT. 1",
    title: "受ける案件は自分で選べる",
    body: "届いた注文は内容・条件・報酬を見てから判断できます。無理に受ける必要はありません。",
  },
  {
    number: "POINT. 2",
    title: "価格は自分で自由に設定",
    body: "Instagram投稿、リール、UGC制作、来店体験など、メニューごとに自分で価格を決められます。",
  },
  {
    number: "POINT. 3",
    title: "チャットで事前確認できる",
    body: "来店日、撮影ルール、投稿条件など、気になる点は依頼主と事前にやり取りできます。",
  },
  {
    number: "POINT. 4",
    title: "納品・報酬履歴を一元管理",
    body: "納品URLの提出、完了した案件の確認、報酬の履歴確認まで、ひとつの画面で管理できます。",
  },
];

function PhoneMock({
  title,
  items,
  highlightLast = false,
}: {
  title: string;
  items: string[];
  highlightLast?: boolean;
}) {
  return (
    <div className="mx-auto w-[180px] rounded-[30px] border-[5px] border-slate-900 bg-white px-3 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] sm:w-[200px]">
      <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
      <p className="mb-4 text-center text-sm font-extrabold text-rose-500">
        {title}
      </p>
      <div className="space-y-2.5">
        {items.map((item, index) => {
          const isHighlight = highlightLast
            ? index === items.length - 1
            : title === "納品完了"
              ? index === 0
              : index === items.length - 1;

          return (
            <div
              key={item}
              className={`rounded-full px-4 py-2.5 text-sm font-bold ${
                isHighlight
                  ? "bg-rose-500 text-white"
                  : "bg-rose-50 text-slate-700"
              }`}
            >
              {item}
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-4 h-1.5 w-14 rounded-full bg-slate-200" />
    </div>
  );
}

export default function ForCreatorsPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfc] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/trendre-logo-full.png"
              alt="Trendre"
              width={126}
              height={34}
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ログイン
            </Link>
            <Link
              href="/signup/creator"
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_30px_rgba(244,63,94,0.22)] transition hover:bg-rose-600"
            >
              無料登録
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        <div className="overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.08),transparent_42%)] px-5 py-6 sm:px-8 sm:py-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-rose-500">
                  TRENDRE FOR CREATORS
                </div>

                <h1 className="max-w-xl text-[2.1rem] font-black leading-[1.12] tracking-tight sm:text-[3rem]">
                  PR案件を、
                  <br />
                  スマホで受ける。
                  <br />
                  <span className="text-rose-500">価格を決めて、</span>
                  <br />
                  自分のペースで働ける。
                </h1>

                <p className="mt-5 max-w-xl text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
                  Trendreは、Instagram・TikTokなどでPR投稿やUGC制作を受けたい人向けのマーケットプレイスです。
                  プロフィール、SNS、メニューを登録すると、依頼主から注文を受けられます。
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup/creator"
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-6 py-4 text-base font-extrabold text-white shadow-[0_16px_32px_rgba(244,63,94,0.25)] transition hover:bg-rose-600"
                  >
                    無料でインフルエンサー登録
                  </Link>
                  <a
                    href="#flow"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-base font-extrabold text-slate-800 transition hover:bg-slate-50"
                  >
                    案件の流れを見る
                  </a>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2.5 sm:max-w-xl">
                  {[
                    "自分で価格設定",
                    "注文は確認して承認",
                    "報酬まで管理",
                  ].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[12px] font-bold leading-5 text-slate-700 sm:text-sm"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-auto w-full max-w-[440px]">
                <div className="relative rounded-[32px] border border-rose-100 bg-[linear-gradient(180deg,#fff,#fff7f9)] p-4 shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
                  <div className="overflow-hidden rounded-[28px] bg-white">
                    <Image
                      src="/brand/trendre-home-hero.png"
                      alt="Trendreのクリエイター向け画面イメージ"
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
          <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.7rem]">
            PRの受注を、もっと分かりやすく。
          </h2>
          <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
            注文内容、チャット、納品URL、報酬履歴をTrendre上で整理できます。
            受けたい内容と価格をメニューとして公開し、依頼主からの注文を待つことができます。
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
                {card.icon}
              </div>
              <h3 className="text-[1.35rem] font-black tracking-tight">
                {card.title}
              </h3>
              <p className="mt-3 text-[15px] font-semibold leading-8 text-slate-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[32px] bg-white px-5 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
              幅広いジャンルのPR案件に出会えます
            </h2>
            <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
              美容、グルメ、旅行、ファッション、店舗PR、D2C商品、UGC制作など、
              あなたの発信ジャンルに合った依頼を受けられます。
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {genreCards.map((card) => (
              <div
                key={card.title}
                className={`${card.bg} rounded-[28px] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]`}
              >
                <div className="text-[28px]">{card.emoji}</div>
                <div className="mt-4">
                  <h3 className="text-[1.2rem] font-black tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-[15px] font-semibold text-slate-600">
                    {card.type}
                  </p>
                  <p className="mt-4 text-[1.8rem] font-black text-rose-500">
                    {card.price}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm font-semibold text-slate-400">
            ※ 掲載価格は参考例です。価格はインフルエンサーが自由に設定できます。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[32px] bg-white px-5 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.6rem]">
                依頼主はあなたのプロフィールを見て注文します
              </h2>
              <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
                依頼主は、SNS種別、カテゴリ、価格帯、地域、メニュー内容などで条件を絞り込みながら、
                ブランドに合う依頼先を探します。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "SNS別に検索",
                  "価格付きで比較",
                  "地域で絞り込み",
                  "メニューを確認",
                ].map((pill) => (
                  <div
                    key={pill}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {pill}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[#fcfcfd] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="overflow-hidden rounded-[22px] bg-white">
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
          <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
            かんたん4ステップですぐに始められます
          </h2>
          <p className="mt-4 text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
            登録後は、プロフィールとメニューを整えるだけで、依頼主からの注文を受けられる状態になります。
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {steps.map((step) => (
            <div
              key={step.step}
              className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8"
            >
              <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <div className="mb-4 inline-flex rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)]">
                    {step.step}
                  </div>
                  <h3 className="text-[1.8rem] font-black tracking-tight sm:text-[2.1rem]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] font-semibold leading-8 text-slate-600 sm:text-[17px]">
                    {step.description}
                  </p>
                </div>

                <div>
                  <PhoneMock
                    title={step.screenTitle}
                    items={step.items}
                    highlightLast={step.screenTitle !== "納品完了"}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 bg-rose-500/95 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
              安心して使えるポイント
            </h2>
            <p className="mt-4 text-[15px] font-semibold leading-8 text-rose-50 sm:text-[17px]">
              自分で案件を選び、価格を決め、事前確認しながら進められる設計です。
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {points.map((point) => (
              <details
                key={point.title}
                className="group rounded-[28px] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-7"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.22em] text-rose-500">
                      {point.number}
                    </p>
                    <h3 className="mt-2 text-[1.45rem] font-black tracking-tight text-slate-950">
                      {point.title}
                    </h3>
                  </div>
                  <span className="text-2xl font-bold text-rose-400 transition group-open:rotate-180">
                    ˅
                  </span>
                </summary>
                <p className="pt-4 text-[15px] font-semibold leading-8 text-slate-600 sm:text-[16px]">
                  {point.body}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-[36px] bg-[#020b2b] px-6 py-10 text-white shadow-[0_30px_70px_rgba(2,6,23,0.25)] sm:px-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.9rem]">
              プロフィールとメニューを整えるだけで、
              <br />
              <span className="text-rose-400">PR案件を受けられる状態に。</span>
            </h2>

            <p className="mt-5 text-[15px] font-semibold leading-8 text-slate-200 sm:text-[17px]">
              まずは無料登録して、SNS・ポートフォリオ・メニューを追加しましょう。
              あなたの発信に合う依頼主からの注文を受けられるようになります。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup/creator"
                className="inline-flex min-w-[280px] items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-slate-950 transition hover:bg-slate-100"
              >
                無料でインフルエンサー登録
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold text-slate-300">
              <span>登録無料</span>
              <span>自分で価格設定</span>
              <span>注文は確認してから承認</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <Image
                src="/brand/trendre-logo-full.png"
                alt="Trendre"
                width={126}
                height={34}
                className="h-8 w-auto"
              />
              <p className="mt-5 max-w-md text-[15px] font-semibold leading-8 text-slate-600">
                Trendreは、日本企業と日本のインフルエンサーをつなぐ
                PR・UGC制作の受注型マーケットプレイスです。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-950">サービス</h3>
              <div className="mt-4 space-y-3 text-[15px] font-semibold text-slate-600">
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
              <h3 className="text-lg font-black text-slate-950">ポリシー</h3>
              <div className="mt-4 space-y-3 text-[15px] font-semibold text-slate-600">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <Link
          href="/signup/creator"
          className="flex w-full items-center justify-center rounded-full bg-rose-500 px-5 py-3.5 text-base font-black text-white shadow-[0_14px_30px_rgba(244,63,94,0.24)]"
        >
          無料でインフルエンサー登録
        </Link>
      </div>
    </main>
  );
}