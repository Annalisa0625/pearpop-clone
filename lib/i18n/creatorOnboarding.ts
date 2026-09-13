import type { AppLocale } from "./types";

type CreatorOnboardingCopy = {
  badge: string;
  title: string;
  checkingError: string;
  completeError: string;
  processing: string;
  skipping: string;
  finishing: string;
  skip: string;
  back: string;
  next: string;
  start: string;
  languageLabel: string;
  slides: ReadonlyArray<{ title: string; body: string }>;
};

export const creatorOnboardingDictionary = {
  ja: {
    badge: "Creator Onboarding",
    title: "クリエイター向けご案内",
    checkingError: "ログイン状態を確認できませんでした。",
    completeError: "案内の完了処理に失敗しました。",
    processing: "処理中...",
    skipping: "処理中...",
    finishing: "完了中...",
    skip: "スキップ",
    back: "戻る",
    next: "次へ",
    start: "開始する",
    languageLabel: "UI言語",
    slides: [
      { title: "ようこそ", body: "このサービスは、企業があなたの参考条件やSNS情報を見て直接依頼できる仕組みです。" },
      { title: "まずやること", body: "承認後は、ダッシュボードから参考条件カードを追加してください。媒体や参考価格、二次利用可否などを登録できます。" },
      { title: "案件の流れ", body: "企業から依頼が届いたら、承認または拒否できます。承認後は案件詳細ページ内でチャットし、納品URLを提出します。" },
      { title: "今後の設定", body: "今後、報酬受け取り設定や支払い関連の設定を追加予定です。現時点ではダッシュボードと参考条件カードの整備を優先してください。" },
    ],
  },
  en: {
    badge: "Creator Onboarding",
    title: "Creator Guide",
    checkingError: "We could not confirm your login status.",
    completeError: "Failed to complete onboarding.",
    processing: "Processing...",
    skipping: "Processing...",
    finishing: "Finishing...",
    skip: "Skip",
    back: "Back",
    next: "Next",
    start: "Get Started",
    languageLabel: "UI language",
    slides: [
      { title: "Welcome", body: "This service lets companies review your rate cards and social account information, then send requests to you directly." },
      { title: "What to do first", body: "After approval, add your rate cards from the dashboard. You can register platforms, reference pricing, and whether secondary use is allowed." },
      { title: "How projects work", body: "When a company sends a request, you can approve or reject it. After approval, you will chat inside the request detail page and later submit your delivery URL." },
      { title: "What comes next", body: "Payout settings and payment-related setup will be added later. For now, please focus on preparing your dashboard and rate cards." },
    ],
  },
  ko: {
    badge: "Creator Onboarding",
    title: "크리에이터 이용 안내",
    checkingError: "로그인 상태를 확인할 수 없습니다.",
    completeError: "이용 안내를 완료하지 못했습니다.",
    processing: "처리 중...",
    skipping: "처리 중...",
    finishing: "완료 중...",
    skip: "건너뛰기",
    back: "이전",
    next: "다음",
    start: "시작하기",
    languageLabel: "UI 언어",
    slides: [
      { title: "환영합니다", body: "브랜드가 크리에이터의 활동 조건과 SNS 정보를 확인하고 직접 협업을 제안할 수 있는 서비스입니다." },
      { title: "먼저 준비할 것", body: "승인 후 대시보드에서 PR 메뉴를 추가해 주세요. 활동 채널, 참고 금액, 2차 활용 가능 여부 등을 설정할 수 있습니다." },
      { title: "협업 진행 방식", body: "브랜드의 제안이 도착하면 수락하거나 거절할 수 있습니다. 수락 후에는 협업 상세 화면에서 채팅하고 결과물 URL을 제출합니다." },
      { title: "추가 설정 안내", body: "수익금 수령 및 결제 관련 설정은 추후 제공될 예정입니다. 지금은 대시보드와 PR 메뉴를 먼저 완성해 주세요." },
    ],
  },
  "zh-TW": {
    badge: "Creator Onboarding",
    title: "創作者使用指南",
    checkingError: "無法確認登入狀態。",
    completeError: "無法完成使用指南。",
    processing: "處理中...",
    skipping: "處理中...",
    finishing: "即將完成...",
    skip: "略過",
    back: "返回",
    next: "下一步",
    start: "開始使用",
    languageLabel: "介面語言",
    slides: [
      { title: "歡迎加入", body: "品牌可查看你的合作條件與社群帳號資訊，並直接向你提出合作邀約。" },
      { title: "先完成這些設定", body: "通過審核後，請從儀表板新增合作方案。你可以設定社群平台、參考報價與二次使用授權等內容。" },
      { title: "合作流程", body: "收到品牌邀約後，你可以接受或婉拒。接受後可在合作詳情中與品牌對話，並提交成果連結。" },
      { title: "後續設定", body: "報酬收款與付款相關功能將於日後提供。現階段請先完善儀表板與合作方案。" },
    ],
  },
} satisfies Record<AppLocale, CreatorOnboardingCopy>;
