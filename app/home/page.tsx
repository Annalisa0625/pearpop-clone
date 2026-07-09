"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StepKey =
  | "search"
  | "request"
  | "approval"
  | "chat"
  | "delivery"
  | "payment";

type WorkflowStep = {
  key: StepKey;
  number: string;
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  points: string[];
};

type HomeInfluencerCard = {
  id: string;
  name: string;
  handle: string;
  category: string;
  location: string;
  platform: "Instagram" | "TikTok" | "YouTube" | "X";
  price: string;
  accent: string;
};

const SEARCH_WORDS = [
  "スキンケア",
  "グルメ",
  "メンズファッション",
  "フィットネス",
  "転職",
  "インテリア",
];

const SEARCH_SUGGESTIONS = [
  "スキンケア",
  "グルメ",
  "メンズファッション",
  "フィットネス",
  "転職",
  "インテリア",
];

const SOCIAL_TABS = ["Instagram", "TikTok", "YouTube", "X"] as const;

const QUICK_FILTERS = [
  "注目Instagramインフルエンサー",
  "TikTokレビュー",
  "UGC制作",
  "美容・コスメ",
  "グルメ・店舗PR",
  "¥30,000以下",
];

const HOME_CARDS: HomeInfluencerCard[] = [
  {
    id: "1",
    name: "なつみ | 旅するグルメ日記",
    handle: "@natsumi_trip",
    category: "グルメ・旅行",
    location: "東京都",
    platform: "Instagram",
    price: "¥50,000〜",
    accent: "from-rose-100 via-orange-50 to-pink-100",
  },
  {
    id: "2",
    name: "ゆうと | ライフスタイル",
    handle: "@yuto_life",
    category: "ライフスタイル",
    location: "神奈川県",
    platform: "TikTok",
    price: "¥80,000〜",
    accent: "from-sky-100 via-slate-50 to-indigo-100",
  },
  {
    id: "3",
    name: "emi | カメラ日常",
    handle: "@emi_camera",
    category: "美容・UGC",
    location: "大阪府",
    platform: "YouTube",
    price: "¥30,000〜",
    accent: "from-lime-100 via-emerald-50 to-green-100",
  },
  {
    id: "4",
    name: "コウ | ガジェットレビュー",
    handle: "@kou_gadget",
    category: "ガジェット・レビュー",
    location: "愛知県",
    platform: "X",
    price: "¥100,000〜",
    accent: "from-slate-100 via-zinc-50 to-gray-200",
  },
];

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: "search",
    number: "01",
    label: "探す",
    eyebrow: "Influencer Search",
    headline: "対応エリアや価格で絞り込み、ブランドに合うインフルエンサーをすぐ見つける。",
    description:
      "Instagram・TikTok・YouTubeなどのSNSタイプに加えて、体験可能なエリア、価格帯、カテゴリで条件を絞り込み。比較しながら候補を一覧で確認できます。",
    points: [
      "SNSタイプ・エリア・価格で絞り込み可能",
      "ブランドに合う候補を一覧で比較",
      "表示価格を見ながら依頼先を検討できる",
    ],
  },
  {
    key: "request",
    number: "02",
    label: "依頼",
    eyebrow: "Direct Request",
    headline: "依頼内容・条件・希望納期を整理して、そのままスムーズに発注。",
    description:
      "投稿内容、体験条件、メニュー内容、予算感、希望納期などを整理したうえで依頼できます。検討から発注までを画面内で完結できるのがTrendreの強みです。",
    points: [
      "希望内容・予算・納期を整理して依頼",
      "インフルエンサーごとに条件を揃えて発注しやすい",
      "表示価格ベースでスピーディーに進行",
    ],
  },
  {
    key: "approval",
    number: "03",
    label: "承認",
    eyebrow: "72h Approval",
    headline: "依頼から72時間以内の承認ルールで、待ちっぱなしを防ぐ安心設計。",
    description:
      "インフルエンサーが依頼を受ける場合は72時間以内に承認されます。注文後72時間レスポンスがない場合は自動キャンセルされるため、企業側も安心して運用できます。",
    points: [
      "依頼は72時間以内に承認可否が分かる",
      "無応答時は自動キャンセルで安心",
      "案件停滞を防ぎ、次の依頼先へ切り替えやすい",
    ],
  },
  {
    key: "chat",
    number: "04",
    label: "チャット",
    eyebrow: "Pre-check Chat",
    headline: "不明点や細かな条件は、事前チャットですり合わせ可能。",
    description:
      "投稿条件、撮影内容、来店日時、注意点など、事前に確認しておきたい事項をチャットでやり取りできます。依頼前後の認識ズレを減らし、トラブルを防ぎます。",
    points: [
      "不明点や細かな条件を事前に確認",
      "来店条件・撮影条件・注意事項の共有がしやすい",
      "認識ズレを減らし、スムーズに進行",
    ],
  },
  {
    key: "delivery",
    number: "05",
    label: "納品",
    eyebrow: "One-click Review",
    headline: "納品物はワンクリックで確認。気になる点はそのまま修正依頼。",
    description:
      "納品された投稿案や素材は画面上で確認可能。条件に満たない箇所がある場合は、そのまま修正依頼を送ることができ、確認からフィードバックまでが一連でつながります。",
    points: [
      "納品物をワンクリックで確認",
      "不足や条件違いがあれば修正依頼可能",
      "確認からフィードバックまで一画面で完結",
    ],
  },
  {
    key: "payment",
    number: "06",
    label: "支払い",
    eyebrow: "Secure Payment",
    headline: "Stripe導入で安全に決済。確認・承認後に支払いが確定する安心フロー。",
    description:
      "決済にはStripeを導入。納品物を確認し、必要に応じて修正依頼を行い、最終的に承認して初めて支払いが確定します。確認前に支払いが確定しないため、安心して利用できます。",
    points: [
      "Stripe導入で安全な決済基盤",
      "納品確認・承認後に支払い確定",
      "修正依頼を挟めるため安心して運用可能",
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PlatformBadge({ platform }: { platform: HomeInfluencerCard["platform"] }) {
  const styles =
    platform === "Instagram"
      ? "bg-white text-[#c13584]"
      : platform === "TikTok"
      ? "bg-white text-black"
      : platform === "YouTube"
      ? "bg-white text-[#ff0000]"
      : "bg-white text-black";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm",
        styles
      )}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-current opacity-90" />
      {platform}
    </div>
  );
}

function HomeInfluencerMockCard({
  card,
  onClick,
}: {
  card: HomeInfluencerCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-white/10">
        <div
          className={cn(
            "relative h-[245px] overflow-hidden bg-gradient-to-br",
            card.accent
          )}
        >
          <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
            <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              {card.category}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-slate-500 shadow-sm">
              ♡
            </div>
          </div>

          <div className="absolute inset-x-5 top-16 space-y-3">
            <div className="rounded-[18px] bg-white/92 p-3 shadow-sm">
              <div className="mb-2 h-2.5 w-24 rounded-full bg-slate-200" />
              <div className="h-2.5 w-full rounded-full bg-slate-200" />
              <div className="mt-2 h-2.5 w-4/5 rounded-full bg-slate-200" />
            </div>
            <div className="ml-auto w-[78%] rounded-[18px] bg-slate-900/85 p-3 text-white shadow-sm">
              <div className="mb-2 h-2.5 w-24 rounded-full bg-white/30" />
              <div className="h-2.5 w-full rounded-full bg-white/30" />
              <div className="mt-2 h-2.5 w-3/4 rounded-full bg-white/30" />
            </div>
            <div className="w-[72%] rounded-[18px] bg-white/92 p-3 shadow-sm">
              <div className="mb-2 h-2.5 w-16 rounded-full bg-slate-200" />
              <div className="h-2.5 w-full rounded-full bg-slate-200" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
            <PlatformBadge platform={card.platform} />
            <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm">
              {card.price}
            </div>
          </div>
        </div>

        <div className="space-y-1 px-5 pb-5 pt-4">
          <div className="line-clamp-1 text-[22px] font-bold leading-tight text-slate-900">
            {card.name}
          </div>
          <div className="text-[15px] font-medium text-slate-600">{card.handle}</div>
          <div className="pt-2 text-[14px] text-slate-500">{card.location}</div>
        </div>
      </div>
    </button>
  );
}

function StepSearchIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">SNSタイプ</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">
                Instagram
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                TikTok
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                YouTube
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">絞り込み</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                東京・大阪
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                ¥10,000〜¥50,000
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                体験案件
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">検索結果</div>
            <div className="text-xs text-slate-500">ブランドに合う候補を比較</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50 to-orange-50 p-3">
              <div className="h-24 rounded-xl bg-white/80" />
              <div className="mt-3 h-3 w-20 rounded-full bg-slate-300" />
              <div className="mt-2 h-3 w-28 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-3">
              <div className="h-24 rounded-xl bg-white/80" />
              <div className="mt-3 h-3 w-20 rounded-full bg-slate-300" />
              <div className="mt-2 h-3 w-28 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRequestIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-pink-500">
              REQUEST
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">
              新作スキンケアPR依頼
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            ¥30,000
          </div>
        </div>

        <div className="mt-5 rounded-[22px] bg-white p-4 ring-1 ring-slate-100">
          <div className="text-sm font-semibold text-slate-900">依頼内容</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
              <span className="text-sm text-slate-700">Instagramフィード投稿 1本</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-sm text-slate-700">商品体験 + 使用感レビュー</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-700">納期: 承認後7日以内</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">価格</div>
            <div className="mt-2 text-sm font-bold text-slate-900">表示価格で依頼</div>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">条件</div>
            <div className="mt-2 text-sm font-bold text-slate-900">内容を整理</div>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-slate-100">
            <div className="text-xs text-slate-500">進行</div>
            <div className="mt-2 text-sm font-bold text-slate-900">そのまま発注</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepApprovalIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="grid items-center gap-5 md:grid-cols-[220px_1fr]">
          <div className="mx-auto flex h-[220px] w-[220px] flex-col items-center justify-center rounded-full border-[14px] border-pink-200 bg-white shadow-sm">
            <div className="text-xs font-semibold tracking-[0.2em] text-slate-500">LIMIT</div>
            <div className="mt-2 text-5xl font-black text-slate-900">72h</div>
            <div className="mt-3 rounded-full bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-600">
              承認期限あり
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <div className="text-sm font-semibold text-slate-900">依頼送信</div>
              <div className="mt-1 text-sm text-slate-500">
                依頼後、72時間以内に承認可否が分かります。
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <div className="text-sm font-semibold text-slate-900">承認された場合</div>
              <div className="mt-1 text-sm text-slate-500">
                案件進行が確定し、チャット・納品へ進めます。
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <div className="text-sm font-semibold text-slate-900">72時間無応答の場合</div>
              <div className="mt-1 text-sm text-slate-500">
                自動キャンセルで待ちっぱなしを防ぎます。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChatIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="space-y-3">
          <div className="w-[78%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">事前確認したい点があります</div>
            <div className="mt-1 text-sm text-slate-600">
              来店可能日時と、投稿内で触れてほしいポイントを確認したいです。
            </div>
          </div>
          <div className="ml-auto w-[74%] rounded-[20px] rounded-br-md bg-slate-900 px-4 py-3 text-white shadow-sm">
            <div className="text-sm font-semibold">もちろんです</div>
            <div className="mt-1 text-sm text-white/80">
              来店は平日午後が可能です。レビュー条件も確認しました。
            </div>
          </div>
          <div className="w-[72%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">条件のすり合わせ完了</div>
            <div className="mt-1 text-sm text-slate-600">
              投稿条件・撮影内容・注意事項まで事前に共有できます。
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            不明点の確認
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            条件のすり合わせ
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            トラブル防止
          </span>
        </div>
      </div>
    </div>
  );
}

function StepDeliveryIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-slate-500">DELIVERY</div>
              <div className="mt-2 text-lg font-bold text-slate-900">納品物プレビュー</div>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              ワンクリック確認
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-rose-50 to-orange-50 p-4">
            <div className="h-44 rounded-[18px] bg-white/80 shadow-inner" />
            <div className="mt-4 h-3 w-24 rounded-full bg-slate-300" />
            <div className="mt-2 h-3 w-4/5 rounded-full bg-slate-200" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">
              内容を確認する
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
              修正依頼を送る
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPaymentIllustration() {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80">
      <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold tracking-[0.2em] text-slate-500">
                  PAYMENT
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">
                  Stripeで安全に決済
                </div>
              </div>
              <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                Stripe
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 text-center text-lg leading-9 text-white">
                  1
                </div>
                <div className="text-sm text-slate-700">支払い情報を登録</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 text-center text-lg leading-9 text-white">
                  2
                </div>
                <div className="text-sm text-slate-700">納品物を確認・必要なら修正依頼</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 text-center text-lg leading-9 text-white">
                  3
                </div>
                <div className="text-sm text-slate-700">承認して初めて支払い確定</div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
            <div className="text-xs font-semibold tracking-[0.2em] text-white/70">SECURE</div>
            <div className="mt-2 text-2xl font-bold">安心の決済設計</div>
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
              納品確認前に支払いが確定しないため、企業側も安心して案件を進められます。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowIllustration({ step }: { step: StepKey }) {
  switch (step) {
    case "search":
      return <StepSearchIllustration />;
    case "request":
      return <StepRequestIllustration />;
    case "approval":
      return <StepApprovalIllustration />;
    case "chat":
      return <StepChatIllustration />;
    case "delivery":
      return <StepDeliveryIllustration />;
    case "payment":
      return <StepPaymentIllustration />;
    default:
      return <StepSearchIllustration />;
  }
}

export default function HomePage() {
  const router = useRouter();

  const [activePlatform, setActivePlatform] =
    useState<(typeof SOCIAL_TABS)[number]>("Instagram");
  const [activeStep, setActiveStep] = useState<StepKey>("search");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const animatedWord = SEARCH_WORDS[wordIndex].slice(0, charIndex);
  const activeWorkflow = WORKFLOW_STEPS.find((step) => step.key === activeStep)!;

  useEffect(() => {
    if (isSearchFocused || searchValue.length > 0) return;

    const currentWord = SEARCH_WORDS[wordIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIndex < currentWord.length) {
      timer = setTimeout(() => setCharIndex((prev) => prev + 1), 120);
    } else if (!isDeleting && charIndex === currentWord.length) {
      timer = setTimeout(() => setIsDeleting(true), 900);
    } else if (isDeleting && charIndex > 0) {
      timer = setTimeout(() => setCharIndex((prev) => prev - 1), 70);
    } else {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % SEARCH_WORDS.length);
      }, 260);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, isSearchFocused, searchValue, wordIndex]);

  const goCreators = (keyword?: string) => {
    const query = keyword?.trim();
    if (query) {
      router.push(`/b/creators?q=${encodeURIComponent(query)}`);
      return;
    }
    router.push("/b/creators");
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[84px] max-w-7xl items-center justify-between px-6">
          <Link href="/home" className="flex items-center">
            <span className="text-[22px] font-black tracking-tight">
              <span className="text-[#e53935]">Tr</span>
              <span className="text-slate-700">endre</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#service-overview" className="text-sm font-semibold text-slate-700">
              サービス概要
            </a>
            <button
              type="button"
              onClick={() => goCreators()}
              className="text-sm font-semibold text-slate-700"
            >
              インフルエンサーを探す
            </button>
            <a href="#pricing" className="text-sm font-semibold text-slate-700">
              料金プラン
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden text-sm font-semibold text-slate-700 md:inline-flex">
              ログイン
            </button>
            <button className="rounded-full bg-[#ff6673] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,102,115,0.28)]">
              無料で企業登録
            </button>
            <button className="hidden text-sm font-semibold text-slate-700 md:inline-flex">
              日本語 ▼
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pt-5">
          <div className="overflow-hidden rounded-[42px] bg-[#25262c] px-6 pb-10 pt-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:px-12 md:pb-12 md:pt-10">
            <div className="mx-auto max-w-[980px] text-center">
              <h1 className="text-[46px] font-black leading-[0.95] tracking-tight md:text-[78px]">
                <span className="block">インフルエンサーPRを</span>
                <span className="mt-1 block text-[42px] md:text-[70px]">
                  <span className="text-[#ff5f9b]">"探す"</span>から
                  <span className="italic">"納品確認"</span>まで。
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-[1040px] text-sm font-medium text-white/85 md:text-[18px] md:whitespace-nowrap">
                Trendreは、インフルエンサーを検索し、依頼し。チャット・納品・支払いまで一元管理できるインフルエンサーマーケティングSaaSです。
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {SOCIAL_TABS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      setActivePlatform(platform);
                      goCreators();
                    }}
                    className={cn(
                      "rounded-full border px-6 py-3 text-base font-semibold transition",
                      activePlatform === platform
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/15 bg-transparent text-white/90 hover:bg-white/5"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>

              <div className="relative mx-auto mt-8 max-w-[990px]">
                <div className="flex overflow-hidden rounded-[24px] bg-white shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
                  <div className="flex w-[180px] items-center gap-3 border-r border-slate-200 px-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      🔍
                    </div>
                    <span className="text-[16px] font-semibold text-slate-800">Search</span>
                  </div>

                  <div className="relative flex-1">
                    <input
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setIsSearchFocused(false), 140);
                      }}
                      className="h-[66px] w-full bg-transparent px-5 text-[20px] font-medium text-slate-800 outline-none"
                    />
                    {!isSearchFocused && !searchValue && (
                      <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-[20px] font-medium text-slate-400">
                        {animatedWord}
                        <span className="ml-0.5 animate-pulse">|</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => goCreators(searchValue || animatedWord)}
                    className="flex w-[160px] items-center justify-center gap-2 bg-[#f45b97] text-[18px] font-bold text-white transition hover:brightness-105"
                  >
                    <span className="text-[22px]">⌕</span>
                    検索
                  </button>
                </div>

                {isSearchFocused && (
                  <div className="absolute left-0 right-0 top-[calc(100%+16px)] z-20 rounded-[28px] bg-white p-6 text-left shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                    <div className="mb-4 text-xs font-bold tracking-[0.16em] text-slate-400">
                      SEARCH IDEAS
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SEARCH_SUGGESTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            goCreators(item);
                          }}
                          className="flex items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="text-[17px] font-semibold text-slate-800">{item}</span>
                          <span className="text-slate-300">↗</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => goCreators()}
                    className="rounded-full border border-white/25 px-5 py-2.5 text-[16px] font-medium text-white/90 transition hover:bg-white/5"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {HOME_CARDS.map((card) => (
                <HomeInfluencerMockCard
                  key={card.id}
                  card={card}
                  onClick={() => goCreators()}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="service-overview" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-[40px] font-black leading-tight tracking-tight text-slate-950 md:text-[64px]">
            PR案件の流れを、ひとつの画面で。
          </h2>

          <div className="mt-8 rounded-full bg-[#23242a] p-2 shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
              {WORKFLOW_STEPS.map((step) => {
                const isActive = step.key === activeStep;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setActiveStep(step.key)}
                    className={cn(
                      "rounded-full px-4 py-3 text-left transition",
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "bg-transparent text-white/80 hover:bg-white/5"
                    )}
                  >
                    <div className="text-[11px] font-bold tracking-[0.18em]">
                      {step.number}
                    </div>
                    <div className="mt-1 text-sm font-semibold md:text-[15px]">{step.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-[34px] bg-[#eeebff] p-6 md:p-8">
            <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#7b6fb0]">
                  {activeWorkflow.eyebrow}
                </div>

                <h3 className="mt-4 text-[36px] font-black leading-[1.08] tracking-tight text-slate-950 md:text-[54px]">
                  {activeWorkflow.headline}
                </h3>

                <p className="mt-5 text-[17px] leading-8 text-slate-600 md:text-[18px]">
                  {activeWorkflow.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {activeWorkflow.points.map((point) => (
                    <div
                      key={point}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#57c38d]" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <WorkflowIllustration step={activeStep} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="overflow-hidden rounded-[40px] bg-[#25262c] px-6 py-12 text-center text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:px-12">
            <h3 className="text-[34px] font-black leading-tight md:text-[56px]">
              次のPR案件は、<span className="text-[#ff5f9b]">すぐ</span>始められます。
            </h3>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
              検索から依頼、72時間承認、チャット、納品確認、Stripe決済まで。
              Trendreなら、日本企業向けのインフルエンサー施策を一気通貫で進められます。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => goCreators()}
                className="rounded-full bg-white px-8 py-4 text-base font-bold text-slate-900"
              >
                インフルエンサーを探す
              </button>
              <button className="rounded-full border border-white/20 px-8 py-4 text-base font-bold text-white">
                無料で企業登録
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}