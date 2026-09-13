import type { AppLocale } from "./types";

export type CreatorDashboardCopy = {
  greeting: string; greetingSeparator: string; overview: string; access: string; link: string;
  profile: string; opens: string; seven: string; thirty: string; ninety: string;
  chartEmpty: string; chartLoading: string; attention: string; orders: string; ordersBody: string;
  jobs: string; jobsBody: string; startMartTitle: string; startMartBody: string;
  startMartCta: string; startLinkTitle: string; startLinkBody: string; startLinkCta: string;
  loading: string; periodLabel: string; trafficTypeLabel: string;
};

const shared = {
  ja: { greeting: "こんにちは", greetingSeparator: "、", overview: "今日の状況を確認しましょう。", access: "アクセス", link: "リンク", profile: "プロフィール", opens: "回", seven: "7日", thirty: "30日", ninety: "90日", chartEmpty: "公開ページが開かれると、ここに推移が表示されます", chartLoading: "アクセスを読み込んでいます", attention: "対応が必要", jobs: "進行中の仕事", jobsBody: "成立後の案件を進めます", startMartTitle: "企業から見つけてもらう", startMartBody: "公開プロフィールを整えると、企業の検索やメニュー注文から新しい仕事につながります。", startMartCta: "プロフィールを作成", startLinkTitle: "SNSから相談を受け付ける", startLinkBody: "専用リンクをSNSプロフィールに置いて、企業から相談や見積もり依頼を直接受け取れます。", startLinkCta: "リンクを作成", loading: "ホームを読み込んでいます…", periodLabel: "集計期間", trafficTypeLabel: "アクセス種別" },
  en: { greeting: "Hello", greetingSeparator: ", ", overview: "Here is what is happening today.", access: "Traffic", link: "Link", profile: "Profile", opens: "views", seven: "7D", thirty: "30D", ninety: "90D", chartEmpty: "Traffic will appear here after your public page is opened", chartLoading: "Loading traffic", attention: "Needs attention", jobs: "Active jobs", jobsBody: "Continue work after agreement", startMartTitle: "Help companies discover you", startMartBody: "Publish your profile to appear in company searches and receive menu orders.", startMartCta: "Create profile", startLinkTitle: "Receive inquiries from social media", startLinkBody: "Add your dedicated link to social profiles and receive inquiries and quote requests.", startLinkCta: "Create link", loading: "Loading Home…", periodLabel: "Analytics period", trafficTypeLabel: "Traffic type" },
  ko: { greeting: "안녕하세요", greetingSeparator: ", ", overview: "오늘의 현황을 확인해 보세요.", access: "방문 수", link: "링크", profile: "프로필", opens: "회", seven: "7일", thirty: "30일", ninety: "90일", chartEmpty: "공개 페이지에 방문자가 생기면 추이가 표시됩니다", chartLoading: "방문 데이터를 불러오는 중입니다", attention: "확인이 필요해요", jobs: "진행 중인 협업", jobsBody: "성사된 협업을 이어서 진행하세요", startMartTitle: "브랜드가 나를 찾도록 설정하기", startMartBody: "프로필을 공개하면 브랜드 검색과 PR 메뉴 주문을 통해 새로운 협업을 받을 수 있어요.", startMartCta: "프로필 만들기", startLinkTitle: "SNS에서 협업 문의받기", startLinkBody: "SNS 프로필에 전용 링크를 추가하고 브랜드의 협업 문의와 견적 요청을 바로 받아보세요.", startLinkCta: "링크 만들기", loading: "홈을 불러오는 중입니다…", periodLabel: "조회 기간", trafficTypeLabel: "방문 경로" },
  "zh-TW": { greeting: "你好", greetingSeparator: "，", overview: "一起看看今天的最新狀況。", access: "瀏覽次數", link: "連結", profile: "個人檔案", opens: "次", seven: "7 天", thirty: "30 天", ninety: "90 天", chartEmpty: "公開頁面開始有人瀏覽後，這裡會顯示趨勢", chartLoading: "正在載入瀏覽數據", attention: "需要處理", jobs: "進行中的合作", jobsBody: "繼續處理已成立的合作", startMartTitle: "讓品牌找到你", startMartBody: "完成並公開個人檔案後，就能出現在品牌搜尋中，也能接收 PR 方案訂單。", startMartCta: "建立個人檔案", startLinkTitle: "從社群平台接收合作諮詢", startLinkBody: "將專屬連結放在社群個人頁面，直接接收品牌的合作諮詢與報價需求。", startLinkCta: "建立連結", loading: "正在載入首頁…", periodLabel: "統計期間", trafficTypeLabel: "瀏覽來源" },
} as const;

export function getCreatorDashboardCopy(locale: AppLocale, creatorOnly: boolean): CreatorDashboardCopy {
  const base = shared[locale];
  const orderCopy = {
    ja: creatorOnly ? ["仕事相談", "新しい相談を確認します"] : ["注文・見積もり依頼", "成立前の依頼を確認します"],
    en: creatorOnly ? ["Work inquiries", "Review new inquiries"] : ["Orders and quote requests", "Review work before agreement"],
    ko: creatorOnly ? ["협업 문의", "새로운 문의를 확인하세요"] : ["주문 및 견적 요청", "성사 전 요청을 확인하세요"],
    "zh-TW": creatorOnly ? ["合作諮詢", "查看新的諮詢"] : ["訂單與報價需求", "查看尚未成立的邀約"],
  }[locale];
  return { ...base, orders: orderCopy[0], ordersBody: orderCopy[1] };
}

export const creatorLocaleTags: Record<AppLocale, string> = { ja: "ja-JP", en: "en-US", ko: "ko-KR", "zh-TW": "zh-TW" };
