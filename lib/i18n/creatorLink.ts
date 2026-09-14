import type { AppLocale } from "./types";

export type CreatorLinkOnboardingCopy = {
  back: string;
  continue: string;
  displayTitle: string;
  displayBody: string;
  displayName: string;
  urlTitle: string;
  urlBody: string;
  checking: string;
  available: string;
  unavailable: string;
  invalid: string;
  checkFailed: string;
  photoTitle: string;
  photoBody: string;
  profilePhoto: string;
  choosePhoto: string;
  photoFormats: string;
  addLater: string;
  socialTitle: string;
  socialBody: string;
  skipSocial: string;
  update: string;
  add: string;
  firstLinkTitle: string;
  firstLinkBody: string;
  addLink: string;
  addLinkLater: string;
  styleTitle: string;
  styleBody: string;
  useStyle: string;
  completeTitle: string;
  completeBody: string;
  keepEditing: string;
  viewPublicPage: string;
  publishing: string;
  publish: string;
  copy: string;
};

export const creatorLinkOnboardingDictionary = {
  ja: {
    checking: "確認中", available: "利用可能", unavailable: "使用されています", invalid: "形式が正しくありません", checkFailed: "確認に失敗しました",
    back: "戻る", continue: "続ける", displayTitle: "表示名を決めましょう", displayBody: "公開ページに表示する名前です。あとから変更できます。", displayName: "表示名", urlTitle: "公開URLを決めましょう", urlBody: "あなた専用のURLです。公開後も変更できます。", photoTitle: "プロフィール写真を追加", photoBody: "すべてのスタイルで、写真は見やすい丸型に表示されます。", profilePhoto: "プロフィール写真", choosePhoto: "写真を選択", photoFormats: "JPEG・PNG・WebP / 5MBまで", addLater: "あとで追加する", socialTitle: "SNSをつなぎましょう", socialBody: "複数追加できます。あとから追加・編集もできます。", skipSocial: "スキップして続ける", update: "更新", add: "追加", firstLinkTitle: "最初のリンクを追加", firstLinkBody: "活動やコンテンツが伝わるリンクを、まずは1つだけ。", addLink: "リンクを追加", addLinkLater: "あとで追加する", styleTitle: "スタイルを選びましょう", styleBody: "完成デザインを1つ選ぶだけ。細かな調整は公開後にできます。", useStyle: "このスタイルで続ける", completeTitle: "あなたのLinkができました", completeBody: "選んだスタイルと実際のプロフィール内容を確認して公開できます。", keepEditing: "編集を続ける", viewPublicPage: "公開ページを見る", publishing: "公開しています…", publish: "Linkを公開する", copy: "コピー",
  },
  en: {
    checking: "Checking", available: "Available", unavailable: "Already in use", invalid: "Invalid format", checkFailed: "Check failed",
    back: "Back", continue: "Continue", displayTitle: "Choose your display name", displayBody: "This name appears on your public page. You can change it later.", displayName: "Display name", urlTitle: "Choose your public URL", urlBody: "This is your personal URL. You can change it after publishing.", photoTitle: "Add a profile photo", photoBody: "Your photo appears in a clear circular frame across every style.", profilePhoto: "Profile photo", choosePhoto: "Choose photo", photoFormats: "JPEG, PNG, or WebP / up to 5 MB", addLater: "Add later", socialTitle: "Connect your social accounts", socialBody: "Add more than one now, or edit them later.", skipSocial: "Skip and continue", update: "Update", add: "Add", firstLinkTitle: "Add your first link", firstLinkBody: "Start with one link that shows your work or content.", addLink: "Add link", addLinkLater: "Add later", styleTitle: "Choose a style", styleBody: "Pick one finished design. You can fine-tune it after publishing.", useStyle: "Continue with this style", completeTitle: "Your Link is ready", completeBody: "Review your selected style and profile, then publish when ready.", keepEditing: "Continue editing", viewPublicPage: "View public page", publishing: "Publishing…", publish: "Publish Link", copy: "Copy",
  },
  ko: {
    checking: "확인 중", available: "사용 가능", unavailable: "이미 사용 중", invalid: "형식이 올바르지 않습니다", checkFailed: "확인하지 못했습니다",
    back: "뒤로", continue: "계속", displayTitle: "활동명을 정해 주세요", displayBody: "공개 페이지에 표시될 이름입니다. 나중에 변경할 수 있어요.", displayName: "활동명", urlTitle: "공개 URL을 정해 주세요", urlBody: "나만의 전용 URL입니다. 공개 후에도 변경할 수 있어요.", photoTitle: "프로필 사진을 추가해 주세요", photoBody: "어떤 스타일을 선택해도 사진은 보기 좋은 원형으로 표시됩니다.", profilePhoto: "프로필 사진", choosePhoto: "사진 선택", photoFormats: "JPEG·PNG·WebP / 최대 5MB", addLater: "나중에 추가", socialTitle: "SNS 계정을 연결해 주세요", socialBody: "여러 개를 추가할 수 있으며 나중에도 수정할 수 있어요.", skipSocial: "건너뛰고 계속", update: "수정", add: "추가", firstLinkTitle: "첫 번째 링크를 추가해 주세요", firstLinkBody: "활동이나 콘텐츠를 보여 줄 링크 하나부터 시작해 보세요.", addLink: "링크 추가", addLinkLater: "나중에 추가", styleTitle: "스타일을 선택해 주세요", styleBody: "완성된 디자인을 하나 고르면 됩니다. 공개 후 세부 설정을 바꿀 수 있어요.", useStyle: "이 스타일로 계속", completeTitle: "나만의 Link가 완성됐어요", completeBody: "선택한 스타일과 프로필 내용을 확인한 뒤 공개할 수 있어요.", keepEditing: "계속 편집", viewPublicPage: "공개 페이지 보기", publishing: "공개 중…", publish: "Link 공개", copy: "복사",
  },
  "zh-TW": {
    checking: "確認中", available: "可以使用", unavailable: "已被使用", invalid: "格式不正確", checkFailed: "無法確認",
    back: "返回", continue: "繼續", displayTitle: "設定創作者名稱", displayBody: "這個名稱會顯示在公開頁面，之後也可以修改。", displayName: "創作者名稱", urlTitle: "設定公開網址", urlBody: "這是你的專屬網址，公開後仍可修改。", photoTitle: "新增個人照片", photoBody: "無論選擇哪種樣式，照片都會以清楚的圓形顯示。", profilePhoto: "個人照片", choosePhoto: "選擇照片", photoFormats: "JPEG、PNG、WebP／最大 5MB", addLater: "稍後新增", socialTitle: "連結社群帳號", socialBody: "可以新增多個帳號，之後也能繼續編輯。", skipSocial: "略過並繼續", update: "更新", add: "新增", firstLinkTitle: "新增第一個連結", firstLinkBody: "先加入一個能展現你的創作或內容的連結。", addLink: "新增連結", addLinkLater: "稍後新增", styleTitle: "選擇頁面風格", styleBody: "挑選一款完整設計即可，公開後仍可調整細節。", useStyle: "使用這個風格", completeTitle: "你的 Link 已完成", completeBody: "確認所選風格與個人資料後，就可以公開頁面。", keepEditing: "繼續編輯", viewPublicPage: "查看公開頁面", publishing: "正在公開…", publish: "公開 Link", copy: "複製",
  },
} satisfies Record<AppLocale, CreatorLinkOnboardingCopy>;
