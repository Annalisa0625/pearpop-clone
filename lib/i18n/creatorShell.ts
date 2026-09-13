import type { AppLocale } from "./types";

export type CreatorShellCopy = {
  notifications: string; accountMenu: string; closeMenu: string;
  accountSettings: string; accountSettingsBody: string; bank: string; bankBody: string;
  earnings: string; earningsBody: string; language: string; help: string; terms: string;
  privacy: string; logout: string; loggingOut: string; limitTitle: string; limitReason: string;
  home: string; orders: string; jobs: string; link: string; profile: string;
};

export const creatorShellDictionary = {
  ja: { notifications: "通知", accountMenu: "アカウント", closeMenu: "メニューを閉じる", accountSettings: "アカウント設定", accountSettingsBody: "ログイン情報・本人情報", bank: "銀行口座", bankBody: "報酬の受取口座", earnings: "報酬", earningsBody: "売上・振込履歴", language: "UI言語", help: "ヘルプ", terms: "利用規約", privacy: "プライバシーポリシー", logout: "ログアウト", loggingOut: "ログアウト中…", limitTitle: "現在、取引が一部制限されています", limitReason: "理由", home: "ホーム", orders: "注文", jobs: "案件", link: "リンク", profile: "プロフィール" },
  en: { notifications: "Notifications", accountMenu: "Account", closeMenu: "Close menu", accountSettings: "Account settings", accountSettingsBody: "Login and identity information", bank: "Bank account", bankBody: "Payout destination", earnings: "Earnings", earningsBody: "Sales and payout history", language: "UI language", help: "Help", terms: "Terms", privacy: "Privacy Policy", logout: "Log out", loggingOut: "Logging out…", limitTitle: "Some account actions are restricted", limitReason: "Reason", home: "Home", orders: "Orders", jobs: "Jobs", link: "Link", profile: "Profile" },
  ko: { notifications: "알림", accountMenu: "계정", closeMenu: "메뉴 닫기", accountSettings: "계정 설정", accountSettingsBody: "로그인 및 본인 정보", bank: "은행 계좌", bankBody: "정산 받을 계좌", earnings: "수익", earningsBody: "매출 및 정산 내역", language: "UI 언어", help: "도움말", terms: "이용약관", privacy: "개인정보 처리방침", logout: "로그아웃", loggingOut: "로그아웃 중…", limitTitle: "현재 일부 거래가 제한되어 있습니다", limitReason: "사유", home: "홈", orders: "의뢰", jobs: "진행 중", link: "링크", profile: "프로필" },
  "zh-TW": { notifications: "通知", accountMenu: "帳號", closeMenu: "關閉選單", accountSettings: "帳號設定", accountSettingsBody: "登入與身分資訊", bank: "銀行帳戶", bankBody: "收益收款帳戶", earnings: "收益", earningsBody: "銷售與撥款紀錄", language: "介面語言", help: "說明中心", terms: "使用條款", privacy: "隱私權政策", logout: "登出", loggingOut: "登出中…", limitTitle: "目前部分交易功能受到限制", limitReason: "原因", home: "首頁", orders: "邀約", jobs: "進行中", link: "連結", profile: "個人檔案" },
} satisfies Record<AppLocale, CreatorShellCopy>;
