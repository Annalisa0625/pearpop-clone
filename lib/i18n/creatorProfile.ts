import {
  creatorSignupAudienceCountryLabels,
  creatorSignupCategoryLabels,
  creatorSignupFollowerRangeLabels,
  creatorSignupPrefectureLabels,
} from "./creatorSignup";
import type { AppLocale } from "./types";

const ja = {
  title: "プロフィール", subtitle: "あなたらしさと得意なことが伝わるプロフィールをつくりましょう。",
  username: "表示名", usernamePlaceholder: "例：ゆな｜美容", usernameHelp: "企業や公開プロフィールに表示される名前です。",
  country: "対象国", uiLanguage: "UI言語", uiLanguageBody: "Trend Martの画面表示に使う言語です。活動国や対応言語とは別に設定できます。",
  categoryTitle: "ジャンル", categoryBody: "得意なジャンルを5つまで選んでください。", categoryCount: "選択中", editGenres: "ジャンルを編集",
  areaTitle: "対応エリア", areaBody: "対応できるエリアをすべて選び、商品配送PRの可否を設定します。", nonJapanAreaBody: "対象国と商品配送PRの可否を設定します。", prefecture: "対応可能エリア", selectPrefecture: "対応できる都道府県を選択", editAreas: "活動エリアを編集",
  productPr: "商品配送PR", productPrYes: "商品を受け取ってPRできる", productPrNo: "商品配送PRは受け付けない",
  contentLanguage: "発信言語", responseLanguage: "対応言語",
  photoSection: "プロフィール画像", photoBody: "あなたの雰囲気が伝わる一枚を選びましょう。", avatar: "プロフィール画像", imageChoose: "写真を選択", noImage: "画像なし",
  portfolioTitle: "ポートフォリオ", portfolioBody: "企業に見せたい実績画像だけを追加します。", portfolioUpload: "画像を追加", portfolioEmpty: "投稿実績や雰囲気が伝わる画像を追加してください。", selectedImages: "選択中", portfolioRecommended: "3枚以上がおすすめ",
  socialTitle: "SNSアカウント", socialBody: "活動しているアカウントとオーディエンスをまとめます。", socialItem: "SNS", socialHandle: "ユーザーネーム / URL", followerRange: "フォロワー数", audienceCountry: "主な視聴者", urlPreview: "URL", addSocial: "SNSを追加", remove: "削除", setupAccount: "アカウントを設定", snsGuide: "SNS種別を選ぶと入力形式が変わります。",
  socialNoAt: "@なしで入力", socialHandleGuide: "ハンドル名を入力", socialUsernameGuide: "ユーザー名を入力", socialUrlGuide: "URLを入力", socialSelectGuide: "SNS種別を選択してください", socialUsernamePlaceholder: "ユーザー名",
  removeConfirm: "この画像を削除しますか？", saving: "保存中...", save: "保存する", selectPlease: "選択してください", errorTitle: "エラー",
  creatorNotFound: "クリエイター情報が見つかりませんでした。", usernameRequired: "表示名を入力してください", usernameInvalid: "表示名は80文字以内で入力してください", categoryRequired: "ジャンルを1つ以上選択してください", categoryLimit: "ジャンルは5つまで選択できます", areaRequired: "対応可能エリアを1つ以上選択してください", productPrRequired: "商品配送PRの可否を選択してください", languageRequired: "発信言語と対応言語を選択してください", socialRequired: "SNSを少なくとも1件、正しく入力してください", socialIncomplete: "SNSに未入力の項目があります",
  missingCreatorId: "creator_id を取得できませんでした。", missingUserId: "user_id を取得できませんでした。", saved: "保存しました。", savedMetadataSyncFailed: "プロフィールは保存されましたが、アカウント情報の同期に失敗しました。再度お試しください。", saveError: "保存中にエラーが発生しました。", uploadFailed: "画像アップロードに失敗しました。",
  servicesTitle: "販売サービス", settings: "関連設定", menusTitle: "メニューの追加・編集", menusBody: "提供するサービスと料金を設定", payoutsSectionTitle: "報酬の受け取り", payoutsTitle: "報酬受け取り", payoutsBody: "受取設定と報酬履歴を確認", statusPrefix: "表示状態", japanesePrefectureOnly: "日本以外の場合は地域名を入力できます。",
  lineTitle: "LINE通知", lineBody: "注文を受けるには、LINEで通知を受け取る設定が必要です。新しい注文・チャット・修正依頼を見逃さないようにできます。", lineCreatorOnlyBody: "仕事相談や大切なお知らせをLINEで受け取れます。", lineMarketplacePrompt: "新しい依頼やメッセージ、修正の連絡をLINEですぐ受け取れます。仕事のチャンスを見逃さないために連携しておきましょう。", lineLinked: "連携済み", lineNotLinked: "未連携", lineConnectedAs: "連携中", lineGenerate: "LINEで通知を受け取る", lineConnect: "LINEを連携する", lineGenerating: "LINEを開いています...", lineUnlink: "連携を解除", lineUnlinking: "解除中...", lineCodeLabel: "LINE連携コード", lineCodeHelp: "LINE公式アカウントを友だち追加し、この6桁コードをそのまま送信してください。", lineExpires: "有効期限", lineOpenLine: "LINEで通知を受け取る", lineOfficialMissing: "LINE公式URL未設定", lineLoading: "確認中", lineTestSend: "テスト通知を送る", lineTestSending: "送信中...", lineCodeCreated: "LINE連携を開始しました。", lineTestSent: "LINEにテスト通知を送信しました。", lineUnlinked: "LINE連携を解除しました。", lineLoadFailed: "LINE連携状況を取得できませんでした。", lineCreateFailed: "LINE連携を開始できませんでした。", lineUnlinkFailed: "LINE連携を解除できませんでした。", lineTestFailed: "LINEテスト通知を送信できませんでした。",
};

export type CreatorProfileCopy = { [Key in keyof typeof ja]: string };

const en = {
  title: "Profile", subtitle: "Build a profile that feels like you and shows what you do best.",
  username: "Display name", usernamePlaceholder: "Example: Yuna Beauty", usernameHelp: "The name shown to brands and on your public profile.",
  country: "Country", uiLanguage: "UI language", uiLanguageBody: "Choose the language used in Trend Mart. This is separate from your country and supported languages.",
  categoryTitle: "Categories", categoryBody: "Select up to 5 categories.", categoryCount: "Selected", editGenres: "Edit genres",
  areaTitle: "Area", areaBody: "Select every area you can support and set your product PR setting.", nonJapanAreaBody: "Set your country and product shipping PR preference.", prefecture: "Available areas", selectPrefecture: "Select all available areas", editAreas: "Edit areas",
  productPr: "Product shipping PR", productPrYes: "I can receive products", productPrNo: "I do not accept shipped product PR",
  contentLanguage: "Content language", responseLanguage: "Response language",
  photoSection: "Profile image", photoBody: "Choose a photo that captures your style.", avatar: "Profile image", imageChoose: "Choose photo", noImage: "No image",
  portfolioTitle: "Portfolio", portfolioBody: "Add only images you want brands to review.", portfolioUpload: "Add image", portfolioEmpty: "Add images that show your past posts or style.", selectedImages: "Selected", portfolioRecommended: "3+ recommended",
  socialTitle: "Social accounts", socialBody: "Bring your social presence and audience together.", socialItem: "SNS", socialHandle: "Username / URL", followerRange: "Follower range", audienceCountry: "Main audience country", urlPreview: "URL", addSocial: "Add social", remove: "Remove", setupAccount: "Set up account", snsGuide: "Input format changes by SNS type.",
  socialNoAt: "No @ needed.", socialHandleGuide: "Enter handle.", socialUsernameGuide: "Enter username.", socialUrlGuide: "Enter URL.", socialSelectGuide: "Select SNS type.", socialUsernamePlaceholder: "Username",
  removeConfirm: "Delete this image?", saving: "Saving...", save: "Save", selectPlease: "Please select", errorTitle: "Error",
  creatorNotFound: "Creator information was not found.", usernameRequired: "Please enter your display name", usernameInvalid: "Display name must be 80 characters or fewer", categoryRequired: "Please select at least one category", categoryLimit: "You can select up to 5 categories", areaRequired: "Please select at least one available area", productPrRequired: "Please select whether you can receive products", languageRequired: "Please select content and response languages", socialRequired: "Please add at least one valid social account", socialIncomplete: "One or more social account fields are incomplete",
  missingCreatorId: "Could not retrieve creator_id.", missingUserId: "Could not retrieve user_id.", saved: "Saved.", savedMetadataSyncFailed: "Your profile was saved, but account information could not be synced. Please try again.", saveError: "An error occurred while saving.", uploadFailed: "Failed to upload image.",
  servicesTitle: "Services", settings: "Related settings", menusTitle: "Add or edit menus", menusBody: "Set the services and rates you offer.", payoutsSectionTitle: "Related settings", payoutsTitle: "Payouts", payoutsBody: "Check payout setup and history.", statusPrefix: "Status", japanesePrefectureOnly: "Enter the area name for countries outside Japan.",
  lineTitle: "LINE notifications", lineBody: "Receive new order, message, revision, and completion alerts on LINE.", lineCreatorOnlyBody: "Receive work inquiries and important updates on LINE.", lineMarketplacePrompt: "Get new requests, messages, and revision updates on LINE so you never miss work.", lineLinked: "Linked", lineNotLinked: "Not linked", lineConnectedAs: "Connected as", lineGenerate: "Receive notifications on LINE", lineConnect: "Connect LINE", lineGenerating: "Opening LINE...", lineUnlink: "Unlink", lineUnlinking: "Unlinking...", lineCodeLabel: "LINE link code", lineCodeHelp: "Add the official LINE account and send this 6-character code in the chat.", lineExpires: "Expires", lineOpenLine: "Open LINE", lineOfficialMissing: "LINE URL not set", lineLoading: "Checking", lineTestSend: "Send test", lineTestSending: "Sending...", lineCodeCreated: "LINE linking started.", lineTestSent: "Test notification sent to LINE.", lineUnlinked: "LINE connection removed.", lineLoadFailed: "Failed to load LINE connection status.", lineCreateFailed: "Failed to start LINE linking.", lineUnlinkFailed: "Failed to unlink LINE.", lineTestFailed: "Failed to send LINE test notification.",
} satisfies CreatorProfileCopy;

const ko = {
  title: "프로필", subtitle: "나만의 매력과 강점이 잘 드러나는 프로필을 완성해 보세요.",
  username: "표시 이름", usernamePlaceholder: "예: 유나 | 뷰티", usernameHelp: "브랜드와 공개 프로필에 표시되는 이름입니다.",
  country: "활동 국가", uiLanguage: "UI 언어", uiLanguageBody: "Trend Mart 화면에 사용할 언어입니다. 활동 국가 및 지원 언어와 별도로 설정할 수 있습니다.",
  categoryTitle: "카테고리", categoryBody: "잘하는 분야를 최대 5개까지 선택해 주세요.", categoryCount: "선택됨", editGenres: "카테고리 수정",
  areaTitle: "활동 지역", areaBody: "방문 가능한 지역을 모두 선택하고 제품 배송 PR 가능 여부를 설정해 주세요.", nonJapanAreaBody: "활동 국가와 제품 배송 PR 가능 여부를 설정해 주세요.", prefecture: "방문 가능 지역", selectPrefecture: "방문 가능한 일본 지역을 선택해 주세요", editAreas: "활동 지역 수정",
  productPr: "제품 배송 PR", productPrYes: "제품을 받아 PR할 수 있어요", productPrNo: "배송 제품 PR은 받지 않아요",
  contentLanguage: "콘텐츠 제작 언어", responseLanguage: "응대 가능 언어",
  photoSection: "프로필 사진", photoBody: "나만의 분위기가 잘 드러나는 사진을 선택해 주세요.", avatar: "프로필 사진", imageChoose: "사진 선택", noImage: "사진 없음",
  portfolioTitle: "포트폴리오", portfolioBody: "브랜드에 보여 주고 싶은 작업 이미지만 추가해 주세요.", portfolioUpload: "이미지 추가", portfolioEmpty: "제작 경험이나 스타일을 보여 줄 이미지를 추가해 주세요.", selectedImages: "선택됨", portfolioRecommended: "3장 이상 권장",
  socialTitle: "소셜 계정", socialBody: "활동 중인 계정과 주요 팔로워 정보를 등록해 주세요.", socialItem: "소셜 계정", socialHandle: "사용자 이름 / URL", followerRange: "팔로워 수", audienceCountry: "주요 팔로워 국가", urlPreview: "URL", addSocial: "소셜 계정 추가", remove: "삭제", setupAccount: "계정 설정", snsGuide: "SNS 종류에 따라 입력 형식이 달라집니다.",
  socialNoAt: "@ 없이 입력해 주세요.", socialHandleGuide: "핸들을 입력해 주세요.", socialUsernameGuide: "사용자 이름을 입력해 주세요.", socialUrlGuide: "URL을 입력해 주세요.", socialSelectGuide: "SNS 종류를 선택해 주세요.", socialUsernamePlaceholder: "사용자 이름",
  removeConfirm: "이 이미지를 삭제할까요?", saving: "저장 중...", save: "저장", selectPlease: "선택해 주세요", errorTitle: "오류",
  creatorNotFound: "크리에이터 정보를 찾을 수 없습니다.", usernameRequired: "표시 이름을 입력해 주세요", usernameInvalid: "표시 이름은 80자 이내로 입력해 주세요", categoryRequired: "카테고리를 1개 이상 선택해 주세요", categoryLimit: "카테고리는 최대 5개까지 선택할 수 있습니다", areaRequired: "방문 가능 지역을 1개 이상 선택해 주세요", productPrRequired: "제품 배송 PR 가능 여부를 선택해 주세요", languageRequired: "콘텐츠 제작 언어와 응대 가능 언어를 선택해 주세요", socialRequired: "소셜 계정을 1개 이상 올바르게 입력해 주세요", socialIncomplete: "소셜 계정에 입력하지 않은 항목이 있습니다",
  missingCreatorId: "크리에이터 ID를 확인할 수 없습니다.", missingUserId: "사용자 ID를 확인할 수 없습니다.", saved: "저장했습니다.", savedMetadataSyncFailed: "프로필은 저장되었지만 계정 정보를 동기화하지 못했습니다. 다시 시도해 주세요.", saveError: "저장 중 오류가 발생했습니다.", uploadFailed: "이미지를 업로드하지 못했습니다.",
  servicesTitle: "판매 서비스", settings: "관련 설정", menusTitle: "PR 메뉴 추가·수정", menusBody: "제공할 서비스와 금액을 설정해 주세요.", payoutsSectionTitle: "관련 설정", payoutsTitle: "수익금 관리", payoutsBody: "수령 설정과 지급 내역을 확인하세요.", statusPrefix: "공개 상태", japanesePrefectureOnly: "일본 외 국가에서는 지역명을 입력할 수 있습니다.",
  lineTitle: "LINE 알림", lineBody: "새 주문, 메시지, 수정 요청 및 완료 알림을 LINE으로 받을 수 있습니다.", lineCreatorOnlyBody: "협업 문의와 중요한 안내를 LINE으로 받을 수 있습니다.", lineMarketplacePrompt: "새로운 제안과 메시지, 수정 요청을 놓치지 않도록 LINE을 연결해 주세요.", lineLinked: "연결됨", lineNotLinked: "연결 안 됨", lineConnectedAs: "연결 계정", lineGenerate: "LINE 알림 받기", lineConnect: "LINE 연결", lineGenerating: "LINE 여는 중...", lineUnlink: "연결 해제", lineUnlinking: "해제 중...", lineCodeLabel: "LINE 연결 코드", lineCodeHelp: "Trend Mart 공식 LINE 계정을 친구로 추가한 뒤 채팅에 6자리 코드를 보내 주세요.", lineExpires: "유효 기간", lineOpenLine: "LINE 열기", lineOfficialMissing: "LINE 공식 계정 URL이 설정되지 않았습니다", lineLoading: "확인 중", lineTestSend: "테스트 알림 보내기", lineTestSending: "전송 중...", lineCodeCreated: "LINE 연결을 시작했습니다.", lineTestSent: "LINE으로 테스트 알림을 보냈습니다.", lineUnlinked: "LINE 연결을 해제했습니다.", lineLoadFailed: "LINE 연결 상태를 불러오지 못했습니다.", lineCreateFailed: "LINE 연결을 시작하지 못했습니다.", lineUnlinkFailed: "LINE 연결을 해제하지 못했습니다.", lineTestFailed: "LINE 테스트 알림을 보내지 못했습니다.",
} satisfies CreatorProfileCopy;

const zhTW = {
  title: "個人檔案", subtitle: "建立能展現個人風格與專長的創作者資料。",
  username: "顯示名稱", usernamePlaceholder: "例如：Yuna｜美妝", usernameHelp: "此名稱會顯示給品牌，並出現在公開的個人檔案中。",
  country: "活動國家／地區", uiLanguage: "介面語言", uiLanguageBody: "選擇 Trend Mart 的介面語言。此設定與活動國家／地區及可使用語言分開管理。",
  categoryTitle: "內容類別", categoryBody: "最多選擇 5 個擅長的內容類別。", categoryCount: "已選擇", editGenres: "編輯內容類別",
  areaTitle: "合作地區", areaBody: "選擇所有可配合到訪的地區，並設定是否接受寄送商品合作。", nonJapanAreaBody: "設定活動國家／地區與是否接受寄送商品合作。", prefecture: "可配合地區", selectPrefecture: "選擇可配合的日本地區", editAreas: "編輯合作地區",
  productPr: "寄送商品合作", productPrYes: "可收取商品並製作推廣內容", productPrNo: "不接受寄送商品合作",
  contentLanguage: "內容製作語言", responseLanguage: "可溝通語言",
  photoSection: "個人檔案照片", photoBody: "選擇一張能展現個人風格的照片。", avatar: "個人檔案照片", imageChoose: "選擇照片", noImage: "尚未選擇照片",
  portfolioTitle: "作品集", portfolioBody: "只需加入想讓品牌查看的作品圖片。", portfolioUpload: "新增圖片", portfolioEmpty: "加入能展現過往作品或個人風格的圖片。", selectedImages: "已選擇", portfolioRecommended: "建議至少 3 張",
  socialTitle: "社群帳號", socialBody: "整理目前經營的社群帳號與主要受眾。", socialItem: "社群帳號", socialHandle: "使用者名稱 / URL", followerRange: "追蹤者人數", audienceCountry: "主要受眾國家／地區", urlPreview: "URL", addSocial: "新增社群帳號", remove: "刪除", setupAccount: "設定帳號", snsGuide: "輸入格式會依社群平台而不同。",
  socialNoAt: "不需輸入 @。", socialHandleGuide: "請輸入頻道代碼。", socialUsernameGuide: "請輸入使用者名稱。", socialUrlGuide: "請輸入 URL。", socialSelectGuide: "請選擇社群平台。", socialUsernamePlaceholder: "使用者名稱",
  removeConfirm: "要刪除這張圖片嗎？", saving: "儲存中...", save: "儲存", selectPlease: "請選擇", errorTitle: "發生錯誤",
  creatorNotFound: "找不到創作者資料。", usernameRequired: "請輸入顯示名稱", usernameInvalid: "顯示名稱不可超過 80 個字元", categoryRequired: "請至少選擇 1 個內容類別", categoryLimit: "最多可選擇 5 個內容類別", areaRequired: "請至少選擇 1 個可配合地區", productPrRequired: "請選擇是否接受寄送商品合作", languageRequired: "請選擇內容製作語言與可溝通語言", socialRequired: "請至少完整填寫 1 個社群帳號", socialIncomplete: "社群帳號仍有未填寫的欄位",
  missingCreatorId: "無法取得創作者 ID。", missingUserId: "無法取得使用者 ID。", saved: "已儲存。", savedMetadataSyncFailed: "個人檔案已儲存，但帳號資料同步失敗，請再試一次。", saveError: "儲存時發生錯誤。", uploadFailed: "圖片上傳失敗。",
  servicesTitle: "合作方案", settings: "相關設定", menusTitle: "新增或編輯 PR 方案", menusBody: "設定可提供的服務與報價。", payoutsSectionTitle: "相關設定", payoutsTitle: "報酬管理", payoutsBody: "查看收款設定與報酬紀錄。", statusPrefix: "公開狀態", japanesePrefectureOnly: "日本以外的國家可輸入地區名稱。",
  lineTitle: "LINE 通知", lineBody: "透過 LINE 接收新訂單、訊息、修改需求與完成通知。", lineCreatorOnlyBody: "透過 LINE 接收合作詢問與重要通知。", lineMarketplacePrompt: "連結 LINE，即時接收新的合作邀約、訊息與修改需求，不錯過合作機會。", lineLinked: "已連結", lineNotLinked: "尚未連結", lineConnectedAs: "連結帳號", lineGenerate: "透過 LINE 接收通知", lineConnect: "連結 LINE", lineGenerating: "正在開啟 LINE...", lineUnlink: "解除連結", lineUnlinking: "解除中...", lineCodeLabel: "LINE 連結代碼", lineCodeHelp: "加入 Trend Mart 官方 LINE 帳號後，將這組 6 位數代碼傳送至聊天室。", lineExpires: "有效期限", lineOpenLine: "開啟 LINE", lineOfficialMissing: "尚未設定 LINE 官方帳號網址", lineLoading: "確認中", lineTestSend: "傳送測試通知", lineTestSending: "傳送中...", lineCodeCreated: "已開始連結 LINE。", lineTestSent: "測試通知已傳送至 LINE。", lineUnlinked: "已解除 LINE 連結。", lineLoadFailed: "無法取得 LINE 連結狀態。", lineCreateFailed: "無法開始連結 LINE。", lineUnlinkFailed: "無法解除 LINE 連結。", lineTestFailed: "無法傳送 LINE 測試通知。",
} satisfies CreatorProfileCopy;

export const creatorProfileDictionary = {
  ja,
  en,
  ko,
  "zh-TW": zhTW,
} satisfies Record<AppLocale, CreatorProfileCopy>;

export const creatorProfileGenreGroupLabels = {
  ja: { beauty: "美容", fitness: "健康", food: "グルメ", travel: "旅行", life: "暮らし", creative: "制作" },
  en: { beauty: "Beauty", fitness: "Fitness", food: "Food", travel: "Travel", life: "Lifestyle", creative: "Creative" },
  ko: { beauty: "뷰티", fitness: "건강·운동", food: "맛집·요리", travel: "여행", life: "라이프스타일", creative: "콘텐츠 제작" },
  "zh-TW": { beauty: "美妝保養", fitness: "健康運動", food: "美食", travel: "旅遊", life: "生活風格", creative: "內容創作" },
} satisfies Record<AppLocale, Record<string, string>>;

export const creatorProfileLanguageLabels = {
  ja: { 日本語: "日本語", 英語: "英語", 韓国語: "韓国語", 中国語: "中国語", その他: "その他" },
  en: { 日本語: "Japanese", 英語: "English", 韓国語: "Korean", 中国語: "Chinese", その他: "Other" },
  ko: { 日本語: "일본어", 英語: "영어", 韓国語: "한국어", 中国語: "중국어", その他: "기타" },
  "zh-TW": { 日本語: "日文", 英語: "英文", 韓国語: "韓文", 中国語: "中文", その他: "其他" },
} satisfies Record<AppLocale, Record<string, string>>;

// These are canonical creator field values shared with Signup; only their display labels are reused.
export const creatorProfileCategoryLabels = creatorSignupCategoryLabels;
export const creatorProfileAudienceCountryLabels = creatorSignupAudienceCountryLabels;
export const creatorProfileFollowerRangeLabels = creatorSignupFollowerRangeLabels;
export const creatorProfilePrefectureLabels = creatorSignupPrefectureLabels;

export function localizeCreatorProfileValue(
  locale: AppLocale,
  value: string,
  labels: Record<AppLocale, Record<string, string>>,
) {
  return labels[locale][value] ?? value;
}

export const creatorProfileDateLocales = {
  ja: "ja-JP",
  en: "en-US",
  ko: "ko-KR",
  "zh-TW": "zh-TW",
} satisfies Record<AppLocale, string>;
