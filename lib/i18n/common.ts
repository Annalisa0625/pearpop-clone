// lib/i18n/common.ts

import type { AppLocale } from "./types";

type CommonDictionary = {
  nav: {
    dashboard: string;
    requests: string;
    jobs: string;
    menus: string;
    profile: string;
    creators: string;
    billing: string;
  };
  titles: {
    creatorDashboard: string;
    companyDashboard: string;
    creatorRequests: string;
    creatorJobs: string;
    creatorMenus: string;
    creatorProfile: string;
    companyCreators: string;
    companyRequests: string;
    companyJobs: string;
    billing: string;
  };
  actions: {
    save: string;
    saving: string;
    submit: string;
    backToDashboard: string;
    viewPendingRequests: string;
    viewActiveJobs: string;
    createMenu: string;
    editProfile: string;
    requestNow: string;
    chooseStandard: string;
    chooseGlobalPro: string;
  };
  labels: {
    status: string;
    approvalStatus: string;
    mainAudience: string;
    platforms: string;
    requestAvailable: string;
    globalProRequired: string;
    recommended: string;
    perMonth: string;
    loading: string;
    noData: string;
  };
};

export const commonDictionary: Record<AppLocale, CommonDictionary> = {
  ja: {
    nav: {
      dashboard: "ダッシュボード",
      requests: "承認待ち依頼",
      jobs: "進行中案件",
      menus: "メニュー",
      profile: "プロフィール",
      creators: "クリエイター一覧",
      billing: "料金プラン",
    },
    titles: {
      creatorDashboard: "クリエイターダッシュボード",
      companyDashboard: "企業ダッシュボード",
      creatorRequests: "承認待ち依頼",
      creatorJobs: "進行中案件",
      creatorMenus: "メニュー",
      creatorProfile: "プロフィール編集",
      companyCreators: "クリエイター一覧",
      companyRequests: "送信済み依頼",
      companyJobs: "進行中案件",
      billing: "料金プラン",
    },
    actions: {
      save: "保存する",
      saving: "保存中...",
      submit: "送信する",
      backToDashboard: "ダッシュボードへ戻る",
      viewPendingRequests: "承認待ちを見る",
      viewActiveJobs: "進行中案件を見る",
      createMenu: "メニューを作成",
      editProfile: "プロフィール編集",
      requestNow: "このメニューを購入する",
      chooseStandard: "Standardを選択",
      chooseGlobalPro: "GlobalProを選択",
    },
    labels: {
      status: "ステータス",
      approvalStatus: "承認状態",
      mainAudience: "主な視聴者",
      platforms: "対応媒体",
      requestAvailable: "購入可能",
      globalProRequired: "GlobalProが必要",
      recommended: "おすすめ",
      perMonth: "/月",
      loading: "読み込み中...",
      noData: "データがありません",
    },
  },

  en: {
    nav: {
      dashboard: "Dashboard",
      requests: "Pending Requests",
      jobs: "Active Jobs",
      menus: "Menus",
      profile: "Profile",
      creators: "Creators",
      billing: "Billing",
    },
    titles: {
      creatorDashboard: "Creator Dashboard",
      companyDashboard: "Company Dashboard",
      creatorRequests: "Pending Requests",
      creatorJobs: "Active Jobs",
      creatorMenus: "Menus",
      creatorProfile: "Edit Profile",
      companyCreators: "Creators",
      companyRequests: "Sent Requests",
      companyJobs: "Active Jobs",
      billing: "Billing",
    },
    actions: {
      save: "Save",
      saving: "Saving...",
      submit: "Submit",
      backToDashboard: "Back to Dashboard",
      viewPendingRequests: "View Pending Requests",
      viewActiveJobs: "View Active Jobs",
      createMenu: "Create Menu",
      editProfile: "Edit Profile",
      requestNow: "Purchase This Menu",
      chooseStandard: "Choose Standard",
      chooseGlobalPro: "Choose GlobalPro",
    },
    labels: {
      status: "Status",
      approvalStatus: "Approval Status",
      mainAudience: "Main Audience",
      platforms: "Platforms",
      requestAvailable: "Available to Purchase",
      globalProRequired: "GlobalPro Required",
      recommended: "Recommended",
      perMonth: "/month",
      loading: "Loading...",
      noData: "No data",
    },
  },

  ko: {
    nav: {
      dashboard: "대시보드",
      requests: "승인 대기 요청",
      jobs: "진행 중인 작업",
      menus: "서비스",
      profile: "프로필",
      creators: "크리에이터",
      billing: "요금제",
    },
    titles: {
      creatorDashboard: "크리에이터 대시보드",
      companyDashboard: "기업 대시보드",
      creatorRequests: "승인 대기 요청",
      creatorJobs: "진행 중인 작업",
      creatorMenus: "서비스",
      creatorProfile: "프로필 수정",
      companyCreators: "크리에이터",
      companyRequests: "보낸 요청",
      companyJobs: "진행 중인 작업",
      billing: "요금제",
    },
    actions: {
      save: "저장",
      saving: "저장 중...",
      submit: "보내기",
      backToDashboard: "대시보드로 돌아가기",
      viewPendingRequests: "승인 대기 요청 보기",
      viewActiveJobs: "진행 중인 작업 보기",
      createMenu: "서비스 만들기",
      editProfile: "프로필 수정",
      requestNow: "이 서비스 구매하기",
      chooseStandard: "Standard 선택",
      chooseGlobalPro: "GlobalPro 선택",
    },
    labels: {
      status: "상태",
      approvalStatus: "승인 상태",
      mainAudience: "주요 시청자",
      platforms: "플랫폼",
      requestAvailable: "구매 가능",
      globalProRequired: "GlobalPro 필요",
      recommended: "추천",
      perMonth: "/월",
      loading: "불러오는 중...",
      noData: "데이터가 없습니다",
    },
  },

  "zh-TW": {
    nav: {
      dashboard: "儀表板",
      requests: "待核准邀請",
      jobs: "進行中案件",
      menus: "服務項目",
      profile: "個人檔案",
      creators: "創作者",
      billing: "方案與帳務",
    },
    titles: {
      creatorDashboard: "創作者儀表板",
      companyDashboard: "品牌儀表板",
      creatorRequests: "待核准邀請",
      creatorJobs: "進行中案件",
      creatorMenus: "服務項目",
      creatorProfile: "編輯個人檔案",
      companyCreators: "創作者",
      companyRequests: "已送出邀請",
      companyJobs: "進行中案件",
      billing: "方案與帳務",
    },
    actions: {
      save: "儲存",
      saving: "儲存中...",
      submit: "送出",
      backToDashboard: "返回儀表板",
      viewPendingRequests: "查看待核准邀請",
      viewActiveJobs: "查看進行中案件",
      createMenu: "建立服務項目",
      editProfile: "編輯個人檔案",
      requestNow: "購買此服務",
      chooseStandard: "選擇 Standard",
      chooseGlobalPro: "選擇 GlobalPro",
    },
    labels: {
      status: "狀態",
      approvalStatus: "核准狀態",
      mainAudience: "主要受眾",
      platforms: "平台",
      requestAvailable: "可購買",
      globalProRequired: "需要 GlobalPro",
      recommended: "推薦",
      perMonth: "/月",
      loading: "載入中...",
      noData: "目前沒有資料",
    },
  },
};

export function getCommonText(locale: AppLocale) {
  return commonDictionary[locale];
}
