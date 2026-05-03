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
};

export function getCommonText(locale: AppLocale) {
  return commonDictionary[locale];
}