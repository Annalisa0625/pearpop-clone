import type { AppLocale } from "./types";

const ja = {
  step: "STEP",
  uiLanguage: "UI言語",
  countrySelectionTitle: "活動する国を選択してください",
  countrySelectionBody: "選択した国に合わせて、最初の表示言語を設定します。あとから右上で変更できます。",
  displayTitle: "基本情報",
  displayBody: "あとから変更できます。",
  displayName: "ユーザーネーム",
  displayNamePlaceholder: "例：Yuna Beauty",
  country: "対象国",
  gender: "性別",
  birthDate: "生年月日",
  accountTitle: "ログイン",
  accountBody: "Google、またはメールで登録します。",
  oauthConnected: "Google連携済み",
  email: "メールアドレス",
  password: "パスワード（8文字以上）",
  passwordConfirm: "パスワードをもう一度入力",
  passwordLengthOk: "8文字以上",
  passwordMatch: "パスワードが一致しています",
  passwordMismatch: "2つのパスワードが一致していません",
  signUpWithGoogle: "Googleで続ける",
  orText: "または",
  lineSetupTitle: "LINE通知を設定",
  lineSetupBody: "新しい注文・チャット・修正依頼・納品承認をLINEで受け取れます。",
  lineSetupBadge: "推奨",
  lineSetupHeadline: "注文を見逃さないために、LINE通知を設定しましょう",
  lineSetupLead: "ボタンを押すとLINEに移動します。許可後は自動でTrend Martに戻り、通知連携が完了します。",
  lineBenefitOrder: "新しい注文が届いたらすぐ通知",
  lineBenefitChat: "チャットや修正依頼も見逃しにくい",
  lineBenefitPrivate: "LINEの友だちや企業には表示されません",
  lineStepAdd: "1. 公式LINEを開く",
  lineStepSend: "2. コードを送信",
  lineStepDone: "3. 連携完了",
  lineCodeLabel: "連携コード",
  lineCodeHelp: "このコードをTrend Mart公式LINEのトークに送信してください。",
  lineOpenButton: "LINEで通知を受け取る",
  lineCopyCode: "コードをコピー",
  lineCopied: "コードをコピーしました",
  lineRefreshCode: "コードを再発行",
  lineCheckStatus: "連携を確認",
  lineChecking: "確認中...",
  lineCreateCode: "連携コードを発行する",
  lineCreatingCode: "発行中...",
  lineSkip: "あとで設定する",
  lineContinue: "次へ進む",
  lineLinkedTitle: "LINE通知の設定が完了しました",
  lineLinkedBody: "新しい注文や重要な連絡をLINEで受け取れるようになりました。",
  lineUnlinkedMessage: "まだ連携を確認できません。公式LINEにコードを送信したあと、もう一度確認してください。",
  lineOfficialMissing: "LINE公式アカウントURLが未設定です。NEXT_PUBLIC_LINE_OFFICIAL_URLを確認してください。",
  lineCodeFailed: "LINE連携コードの発行に失敗しました。少し時間を置いて再度お試しください。",
  categoryTitle: "ジャンル",
  categoryBody: "得意なジャンルを5つまで選んでください。",
  categoryCount: "選択中",
  areaTitle: "対応エリア",
  areaBody: "訪問・体験案件で対応できるエリアをすべて選んでください。",
  nonJapanAreaTitle: "商品配送PR",
  nonJapanAreaBody: "商品配送PRの受付可否を設定してください。",
  prefecture: "対応可能エリア",
  selectPrefecture: "複数選択できます",
  productPr: "商品配送PR",
  productPrYes: "商品を受け取ってPRできる",
  productPrNo: "商品配送PRは受け付けない",
  socialTitle: "SNS",
  socialBody: "企業が確認するSNSを1つ以上登録してください。",
  platform: "SNS種別",
  socialHandle: "ユーザーネーム",
  followerRange: "フォロワー数",
  audienceCountry: "主なフォロワー層",
  urlPreview: "URL",
  addSocial: "SNSを追加",
  remove: "削除",
  imagesTitle: "写真",
  imagesBody: "プロフィール画像1枚とポートフォリオ画像3枚以上が必要です。",
  avatar: "プロフィール画像",
  avatarHelp: "丸いアイコンに入る位置を調整してから保存します。",
  avatarChoose: "画像を選択",
  portfolio: "ポートフォリオ画像",
  portfolioHelp: "最低3枚。雰囲気が伝わる写真を選んでください。",
  portfolioChoose: "画像を追加",
  menuTitle: "メニュー",
  menuBody: "企業が購入できるメニューを1つ以上作成してください。",
  nonPaidMarketplaceTitle: "登録内容の確認",
  nonPaidMarketplaceBody: "韓国・台湾では、V1の有償メニュー機能は提供していません。プロフィールとSNSを登録して公開できます。",
  menuType: "メニュー種別",
  customMenuName: "メニュー名",
  customMenuPlaceholder: "例）Instagramライブ配信",
  priceLabel: "金額（円）",
  price: "例）11,000",
  minimumPrice: "3,000円以上で入力してください",
  addMenu: "メニューを追加",
  termsTitle: "確認",
  termsLabel: "利用規約に同意する",
  privacyLabel: "プライバシーポリシーに同意する",
  termsLink: "利用規約",
  privacyLink: "プライバシーポリシー",
  continue: "次へ",
  back: "戻る",
  finish: "登録する",
  loading: "処理中...",
  preparing: "準備しています...",
  preparingTitle: "プロフィールを準備しています",
  preparingBody: "もう少しで完了です。入力内容は後から変更できます。メニュー数を増やすと、企業に選ばれる機会も広がります。",
  nonPaidPreparingBody: "もう少しで完了です。プロフィールとSNSの内容は後から変更できます。",
  selectPlease: "選択してください",
  login: "ログイン",
  reset: "最初から",
  displayNameRequired: "ユーザーネームを入力してください",
  genderRequired: "性別を選択してください",
  birthDateRequired: "生年月日を選択してください",
  ageRequired: "18歳以上の方のみ登録できます",
  emailRequired: "メールアドレスを入力してください",
  emailInvalid: "メールアドレスの形式が正しくありません",
  passwordRequired: "パスワードは8文字以上必要です",
  passwordConfirmRequired: "確認用パスワードを入力してください",
  passwordMismatchError: "2つのパスワードが一致していません",
  categoryRequired: "ジャンルを1つ以上選択してください",
  categoryLimit: "ジャンルは5つまで選択できます",
  areaRequired: "対応可能エリアを1つ以上選択してください",
  productPrRequired: "商品配送PRの可否を選択してください",
  socialRequired: "SNSを少なくとも1件、正しく入力してください",
  avatarRequired: "プロフィール画像を追加してください",
  portfolioRequired: "ポートフォリオ画像を3枚以上追加してください",
  menuRequired: "メニューを少なくとも1つ正しく入力してください",
  customMenuNameRequired: "メニュー名を入力してください",
  termsRequired: "利用規約とプライバシーポリシーへの同意が必要です",
  signupFailed: "登録に失敗しました",
  existingEmailSignInFailed: "このメールアドレスはすでに登録されています。登録時のパスワードを確認するか、別のメールアドレスを使用してください。",
  companyAccountConflict: "このメールアドレスは企業アカウントに登録されています。Creator登録には別のアカウントを使用してください。",
  imageUploadFailed: "画像のアップロードに失敗しました",
  sessionMissing: "アカウント作成後のログイン状態を確認できませんでした。Supabase Authでメール確認が必須になっている可能性があります。",
  socialNoAt: "@なしで入力",
  socialHandleGuide: "ハンドル名を入力",
  socialUsernameGuide: "ユーザー名を入力",
  socialUrlGuide: "URLを入力",
  socialSelectGuide: "SNS種別を選択してください",
  socialUsernamePlaceholder: "ユーザー名",
  notSelected: "未選択",
  registrationSavedCreatorOnly: "登録が完了しました",
  registrationSavedMarketplace: "登録内容を保存しました",
  completionHeadlineCreatorOnly: "仕事の通知をLINEで受け取りましょう",
  completionHeadlineMarketplace: "あと一歩で、注文を受け取れる状態になります",
  completionLeadCreatorOnly: "新しい仕事相談や、これからの大切な通知をLINEでお知らせします。LINE連携はあとからプロフィールでも設定できます。",
  completionLeadMarketplace: "注文を受けるには、LINEで通知を受け取る設定が必要です。新規注文、チャット、修正依頼、納品承認などの大切な連絡を見逃さないように、先にLINE連携を完了してください。",
  lineOpening: "LINEを開いています...",
  lineConnect: "LINEを連携する",
  lineSetLater: "あとで設定する",
  completionPrivacyCreatorOnly: "LINE連携は任意です。あとからプロフィールでも設定できます。",
  completionPrivacyMarketplace: "LINEの友だちや企業に、通知設定が見えることはありません。",
  completionAsideTitleCreatorOnly: "LINE通知",
  completionAsideTitleMarketplace: "通知設定を完了しましょう",
  completionAsideBodyCreatorOnly: "仕事相談や大切なお知らせを受け取れます",
  completionAsideBodyMarketplace: "案件対応に必要な連絡を受け取れます",
  completionTipsCreatorOnly: [
    { title: "仕事相談を見逃さない", body: "Trendre Linkに届いた新しい仕事相談をLINEで確認できます。" },
    { title: "大切なお知らせを受け取る", body: "今後の重要な通知も、同じLINEアカウントで受け取れます。" },
    { title: "あとからでも設定できる", body: "LINE連携はプロフィール画面からいつでも設定できます。" },
  ],
  completionTipsMarketplace: [
    { title: "注文通知をすぐ受け取る", body: "企業から注文や依頼が届いたときにLINEで確認できます。" },
    { title: "チャットを見逃さない", body: "案件中の確認や修正依頼にも気づきやすくなります。" },
    { title: "プロフィールは後から編集できます", body: "メニュー数を増やすと、企業に選ばれる機会も増えます。" },
  ],
  progress: (current: number, total: number) => `STEP ${current}/${total}`,
  socialItem: (index: number) => `SNS ${index}`,
  menuItem: (index: number) => `Menu ${index}`,
  oauthConnectedAccount: (email: string) => `Google連携済み：${email}`,
  lineLinkedAccount: (name: string) => `LINE通知の設定が完了しました：${name}`,
  portfolioImageAlt: (index: number) => `ポートフォリオ画像 ${index}`,
} as const;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => unknown
    ? (...args: A) => string
    : T extends readonly (infer U)[]
      ? ReadonlyArray<Widen<U>>
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type CreatorSignupCopy = Widen<typeof ja>;

const en: CreatorSignupCopy = {
  ...ja,
  step: "STEP", uiLanguage: "UI language", countrySelectionTitle: "Choose where you create", countrySelectionBody: "We’ll set an initial display language for your country. You can change it from the top right at any time.", displayTitle: "Basic info", displayBody: "You can edit this later.", displayName: "Username", displayNamePlaceholder: "Example: Yuna Beauty", country: "Country", gender: "Gender", birthDate: "Date of birth",
  accountTitle: "Login", accountBody: "Continue with Google or email.", oauthConnected: "Google connected", email: "Email", password: "Password (8+ characters)", passwordConfirm: "Enter password again", passwordLengthOk: "8 or more characters", passwordMatch: "Passwords match", passwordMismatch: "Passwords do not match", signUpWithGoogle: "Continue with Google", orText: "or",
  lineSetupTitle: "Set up LINE notifications", lineSetupBody: "Get new orders, chat messages, revision requests, and completion updates on LINE.", lineSetupBadge: "Recommended", lineSetupHeadline: "Set up LINE notifications so you do not miss new orders", lineSetupLead: "Tap the button to open LINE. After allowing access, you will automatically return to Trendre.", lineBenefitOrder: "Get notified as soon as a new order arrives", lineBenefitChat: "Do not miss chats or revision requests", lineBenefitPrivate: "Your LINE friends and brands will not see it", lineStepAdd: "1. Open official LINE", lineStepSend: "2. Send the code", lineStepDone: "3. Connected", lineCodeLabel: "Link code", lineCodeHelp: "Send this code to the Trendre official LINE chat.", lineOpenButton: "Receive notifications on LINE", lineCopyCode: "Copy code", lineCopied: "Code copied", lineRefreshCode: "Issue new code", lineCheckStatus: "Check connection", lineChecking: "Checking...", lineCreateCode: "Issue link code", lineCreatingCode: "Issuing...", lineSkip: "Set up later", lineContinue: "Continue", lineLinkedTitle: "LINE notifications are ready", lineLinkedBody: "You can now receive new orders and important updates on LINE.", lineUnlinkedMessage: "Connection has not been confirmed yet. Send the code to the official LINE chat, then check again.", lineOfficialMissing: "The official LINE URL is not configured. Please check NEXT_PUBLIC_LINE_OFFICIAL_URL.", lineCodeFailed: "Could not issue a LINE link code. Please try again later.",
  categoryTitle: "Categories", categoryBody: "Select up to 5 categories.", categoryCount: "Selected", areaTitle: "Area", areaBody: "Select all areas where you can accept visit or experience jobs.", nonJapanAreaTitle: "Product shipping PR", nonJapanAreaBody: "Choose whether you accept shipped product PR.", prefecture: "Available areas", selectPrefecture: "Multiple selections allowed", productPr: "Product shipping PR", productPrYes: "I can receive products", productPrNo: "I do not accept shipped product PR",
  socialTitle: "Socials", socialBody: "Add at least one social account.", platform: "SNS type", socialHandle: "Username", followerRange: "Follower range", audienceCountry: "Main audience country", urlPreview: "URL", addSocial: "Add social", remove: "Remove",
  imagesTitle: "Images", imagesBody: "Add one profile image and at least three portfolio images.", avatar: "Profile image", avatarHelp: "Adjust the crop for the round profile icon before saving.", avatarChoose: "Choose image", portfolio: "Portfolio images", portfolioHelp: "At least 3 images are required.", portfolioChoose: "Add images",
  menuTitle: "Menus", menuBody: "Create at least one menu brands can order.", nonPaidMarketplaceTitle: "Review your registration", nonPaidMarketplaceBody: "Paid menus are not available in Korea or Taiwan in V1. You can publish your profile with your social accounts.", menuType: "Menu type", customMenuName: "Menu name", customMenuPlaceholder: "Example: Instagram live stream", priceLabel: "Price (JPY)", price: "Example: 11,000", minimumPrice: "Please enter JPY 3,000 or more", addMenu: "Add menu",
  termsTitle: "Confirm", termsLabel: "I agree to the Terms", privacyLabel: "I agree to the Privacy Policy", termsLink: "Terms", privacyLink: "Privacy Policy", continue: "Next", back: "Back", finish: "Sign up", loading: "Processing...", preparing: "Preparing...", preparingTitle: "Preparing your profile", preparingBody: "Almost done. You can edit your details later. Adding more menus can increase your chances of receiving orders.", nonPaidPreparingBody: "Almost done. You can edit your profile and social accounts later.", selectPlease: "Please select", login: "Login", reset: "Reset",
  displayNameRequired: "Please enter your username", genderRequired: "Please select your gender", birthDateRequired: "Please select your date of birth", ageRequired: "You must be 18 or older to register", emailRequired: "Please enter your email address", emailInvalid: "Please enter a valid email address", passwordRequired: "Password must be at least 8 characters", passwordConfirmRequired: "Please enter the password again", passwordMismatchError: "The two passwords do not match", categoryRequired: "Please select at least one category", categoryLimit: "You can select up to 5 categories", areaRequired: "Please select at least one available area", productPrRequired: "Please select whether you can receive products", socialRequired: "Please add at least one valid social account", avatarRequired: "Please add a profile image", portfolioRequired: "Please add at least 3 portfolio images", menuRequired: "Please add at least one valid menu", customMenuNameRequired: "Please enter a menu name", termsRequired: "You must agree to the Terms and Privacy Policy", signupFailed: "Sign up failed", existingEmailSignInFailed: "This email address is already registered. Check the password used when registering, or use a different email address.", companyAccountConflict: "This email address is registered to a company account. Please use a different account to register as a Creator.", imageUploadFailed: "Failed to upload images", sessionMissing: "Could not confirm your signed-in session after account creation. Email confirmation may be required in Supabase Auth settings.",
  socialNoAt: "No @ needed.", socialHandleGuide: "Enter handle.", socialUsernameGuide: "Enter username.", socialUrlGuide: "Enter URL.", socialSelectGuide: "Select SNS type.", socialUsernamePlaceholder: "Username", notSelected: "Not selected",
  registrationSavedCreatorOnly: "Your registration is complete", registrationSavedMarketplace: "Your registration has been saved", completionHeadlineCreatorOnly: "Receive work notifications on LINE", completionHeadlineMarketplace: "One more step to start receiving orders", completionLeadCreatorOnly: "Get notified on LINE about new work inquiries and future important updates. You can also connect LINE later from your profile.", completionLeadMarketplace: "To receive orders, you need to enable LINE notifications. Connect LINE now so you do not miss new orders, chats, revision requests, or approvals.", lineOpening: "Opening LINE...", lineConnect: "Connect LINE", lineSetLater: "Set up later", completionPrivacyCreatorOnly: "LINE connection is optional and can be set up later from your profile.", completionPrivacyMarketplace: "Your LINE notification setting is not visible to your friends or brands.", completionAsideTitleCreatorOnly: "LINE notifications", completionAsideTitleMarketplace: "Complete notification setup", completionAsideBodyCreatorOnly: "Receive work inquiries and important updates", completionAsideBodyMarketplace: "Receive the updates needed for orders",
  completionTipsCreatorOnly: [{ title: "Do not miss work inquiries", body: "Get notified on LINE when a new work inquiry arrives through Trendre Link." }, { title: "Receive important updates", body: "Future important notifications will arrive at this same LINE account." }, { title: "Set it up anytime", body: "You can connect LINE later from your profile." }],
  completionTipsMarketplace: [{ title: "Receive order alerts immediately", body: "Get notified on LINE when a brand sends an order or request." }, { title: "Do not miss chats", body: "Stay on top of confirmations and revision requests during jobs." }, { title: "You can edit your profile later", body: "Adding more menus can increase your chances of receiving orders." }],
  progress: (current, total) => `STEP ${current}/${total}`, socialItem: (index) => `Social account ${index}`, menuItem: (index) => `Menu ${index}`, oauthConnectedAccount: (email) => `Google connected: ${email}`, lineLinkedAccount: (name) => `LINE notifications are ready: ${name}`, portfolioImageAlt: (index) => `Portfolio image ${index}`,
};

const ko: CreatorSignupCopy = {
  ...ja,
  uiLanguage: "UI 언어", countrySelectionTitle: "활동할 국가를 선택해 주세요", countrySelectionBody: "선택한 국가에 맞춰 첫 화면 언어를 설정합니다. 오른쪽 위에서 언제든 변경할 수 있어요.", displayTitle: "기본 정보", displayBody: "입력한 내용은 나중에 수정할 수 있어요.", displayName: "활동명", displayNamePlaceholder: "예: Yuna Beauty", country: "활동 국가", gender: "성별", birthDate: "생년월일",
  accountTitle: "계정 만들기", accountBody: "Google 계정 또는 이메일로 가입해 주세요.", oauthConnected: "Google 계정 연결 완료", email: "이메일 주소", password: "비밀번호(8자 이상)", passwordConfirm: "비밀번호 다시 입력", passwordLengthOk: "8자 이상", passwordMatch: "비밀번호가 일치합니다", passwordMismatch: "비밀번호가 일치하지 않습니다", signUpWithGoogle: "Google 계정으로 계속하기", orText: "또는",
  lineSetupTitle: "LINE 알림 설정", lineSetupBody: "새 주문, 채팅, 수정 요청, 납품 승인 알림을 LINE으로 받아보세요.", lineSetupBadge: "권장", lineSetupHeadline: "새로운 협업을 놓치지 않도록 LINE 알림을 설정해 주세요", lineSetupLead: "버튼을 누르면 LINE으로 이동합니다. 연결을 허용하면 Trend Mart로 자동으로 돌아와 설정이 완료됩니다.", lineBenefitOrder: "새 주문이 들어오면 바로 알림", lineBenefitChat: "채팅과 수정 요청도 빠르게 확인", lineBenefitPrivate: "LINE 친구나 브랜드에는 공개되지 않음", lineStepAdd: "1. Trend Mart 공식 LINE 열기", lineStepSend: "2. 연결 코드 보내기", lineStepDone: "3. 연결 완료", lineCodeLabel: "연결 코드", lineCodeHelp: "이 코드를 Trend Mart 공식 LINE 채팅으로 보내 주세요.", lineOpenButton: "LINE 알림 받기", lineCopyCode: "코드 복사", lineCopied: "코드를 복사했습니다", lineRefreshCode: "새 코드 받기", lineCheckStatus: "연결 확인", lineChecking: "확인 중...", lineCreateCode: "연결 코드 받기", lineCreatingCode: "발급 중...", lineSkip: "나중에 설정", lineContinue: "계속", lineLinkedTitle: "LINE 알림 설정이 완료되었습니다", lineLinkedBody: "이제 새 주문과 중요한 안내를 LINE으로 받을 수 있습니다.", lineUnlinkedMessage: "아직 연결되지 않았습니다. 공식 LINE 채팅으로 코드를 보낸 뒤 다시 확인해 주세요.", lineOfficialMissing: "공식 LINE URL이 설정되어 있지 않습니다. NEXT_PUBLIC_LINE_OFFICIAL_URL을 확인해 주세요.", lineCodeFailed: "LINE 연결 코드를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  categoryTitle: "활동 카테고리", categoryBody: "자신 있는 분야를 최대 5개까지 선택해 주세요.", categoryCount: "선택한 카테고리", areaTitle: "활동 가능 지역", areaBody: "방문 또는 체험형 협업이 가능한 지역을 모두 선택해 주세요.", nonJapanAreaTitle: "제품 배송 PR", nonJapanAreaBody: "제품을 배송받아 PR할 수 있는지 선택해 주세요.", prefecture: "활동 가능 지역", selectPrefecture: "여러 지역을 선택할 수 있어요", productPr: "제품 배송 PR", productPrYes: "제품을 배송받아 PR할 수 있어요", productPrNo: "제품 배송 PR을 받지 않아요",
  socialTitle: "소셜 계정", socialBody: "브랜드가 확인할 수 있는 소셜 계정을 1개 이상 등록해 주세요.", platform: "플랫폼", socialHandle: "사용자 이름", followerRange: "팔로워 수", audienceCountry: "주요 팔로워 국가", urlPreview: "미리 보기 URL", addSocial: "소셜 계정 추가", remove: "삭제",
  imagesTitle: "프로필 사진", imagesBody: "프로필 사진 1장과 포트폴리오 사진을 3장 이상 등록해 주세요.", avatar: "프로필 사진", avatarHelp: "원형 프로필에 잘 보이도록 위치를 조정한 뒤 저장해 주세요.", avatarChoose: "사진 선택", portfolio: "포트폴리오", portfolioHelp: "분위기와 작업 스타일을 보여 주는 사진을 3장 이상 선택해 주세요.", portfolioChoose: "사진 추가",
  menuTitle: "PR 메뉴", menuBody: "브랜드가 의뢰할 수 있는 PR 메뉴를 1개 이상 만들어 주세요.", nonPaidMarketplaceTitle: "가입 정보 확인", nonPaidMarketplaceBody: "한국과 대만에서는 V1 유료 메뉴 기능을 제공하지 않습니다. 프로필과 SNS를 등록한 뒤 공개할 수 있습니다.", menuType: "PR 유형", customMenuName: "PR 메뉴명", customMenuPlaceholder: "예: Instagram 라이브 방송", priceLabel: "금액(엔)", price: "예: 11,000", minimumPrice: "3,000엔 이상 입력해 주세요", addMenu: "PR 메뉴 추가",
  termsTitle: "약관 동의", termsLabel: "이용약관에 동의합니다", privacyLabel: "개인정보 처리방침에 동의합니다", termsLink: "이용약관", privacyLink: "개인정보 처리방침", continue: "다음", back: "이전", finish: "가입 완료", loading: "처리 중...", preparing: "프로필 준비 중...", preparingTitle: "프로필을 준비하고 있어요", preparingBody: "곧 완료됩니다. 입력한 내용은 나중에 수정할 수 있으며, PR 메뉴를 더 추가하면 브랜드와 만날 기회도 늘어납니다.", nonPaidPreparingBody: "곧 완료됩니다. 프로필과 SNS 정보는 나중에도 수정할 수 있습니다.", selectPlease: "선택해 주세요", login: "로그인", reset: "처음부터",
  displayNameRequired: "활동명을 입력해 주세요", genderRequired: "성별을 선택해 주세요", birthDateRequired: "생년월일을 선택해 주세요", ageRequired: "만 18세 이상만 가입할 수 있습니다", emailRequired: "이메일 주소를 입력해 주세요", emailInvalid: "올바른 이메일 주소를 입력해 주세요", passwordRequired: "비밀번호는 8자 이상이어야 합니다", passwordConfirmRequired: "비밀번호를 한 번 더 입력해 주세요", passwordMismatchError: "비밀번호가 일치하지 않습니다", categoryRequired: "카테고리를 1개 이상 선택해 주세요", categoryLimit: "카테고리는 최대 5개까지 선택할 수 있습니다", areaRequired: "활동 가능 지역을 1개 이상 선택해 주세요", productPrRequired: "제품 배송 PR 가능 여부를 선택해 주세요", socialRequired: "유효한 소셜 계정을 1개 이상 등록해 주세요", avatarRequired: "프로필 사진을 등록해 주세요", portfolioRequired: "포트폴리오 사진을 3장 이상 등록해 주세요", menuRequired: "유효한 PR 메뉴를 1개 이상 등록해 주세요", customMenuNameRequired: "PR 메뉴명을 입력해 주세요", termsRequired: "이용약관과 개인정보 처리방침에 동의해 주세요", signupFailed: "가입을 완료하지 못했습니다", existingEmailSignInFailed: "이미 가입된 이메일 주소입니다. 기존 비밀번호를 확인하거나 다른 이메일 주소를 사용해 주세요.", companyAccountConflict: "기업 계정에 등록된 이메일 주소입니다. 크리에이터 가입에는 다른 계정을 사용해 주세요.", imageUploadFailed: "사진을 업로드하지 못했습니다", sessionMissing: "계정 생성 후 로그인 상태를 확인하지 못했습니다. Supabase Auth에서 이메일 인증이 필요할 수 있습니다.",
  socialNoAt: "@ 없이 입력해 주세요", socialHandleGuide: "채널 핸들을 입력해 주세요", socialUsernameGuide: "사용자 이름을 입력해 주세요", socialUrlGuide: "URL을 입력해 주세요", socialSelectGuide: "플랫폼을 선택해 주세요", socialUsernamePlaceholder: "사용자 이름", notSelected: "선택 안 함",
  registrationSavedCreatorOnly: "가입이 완료되었습니다", registrationSavedMarketplace: "가입 정보를 저장했습니다", completionHeadlineCreatorOnly: "새로운 협업 알림을 LINE으로 받아보세요", completionHeadlineMarketplace: "LINE만 연결하면 주문을 받을 준비가 끝나요", completionLeadCreatorOnly: "새로운 협업 문의와 중요한 안내를 LINE으로 보내 드립니다. 프로필에서 나중에 연결해도 됩니다.", completionLeadMarketplace: "주문을 받으려면 LINE 알림 설정이 필요합니다. 새 주문, 채팅, 수정 요청, 납품 승인을 놓치지 않도록 지금 연결해 주세요.", lineOpening: "LINE 여는 중...", lineConnect: "LINE 연결", lineSetLater: "나중에 설정", completionPrivacyCreatorOnly: "LINE 연결은 선택 사항이며 프로필에서 언제든 설정할 수 있습니다.", completionPrivacyMarketplace: "LINE 알림 설정은 LINE 친구나 브랜드에 공개되지 않습니다.", completionAsideTitleCreatorOnly: "LINE 알림", completionAsideTitleMarketplace: "알림 설정을 완료해 주세요", completionAsideBodyCreatorOnly: "협업 문의와 중요한 안내를 받아볼 수 있어요", completionAsideBodyMarketplace: "협업 진행에 필요한 알림을 받아볼 수 있어요",
  completionTipsCreatorOnly: [{ title: "협업 문의를 놓치지 않아요", body: "Trendre Link에 새 문의가 오면 LINE으로 확인할 수 있어요." }, { title: "중요한 안내를 한곳에서", body: "앞으로의 주요 알림도 같은 LINE 계정으로 보내 드려요." }, { title: "나중에 연결해도 괜찮아요", body: "프로필에서 언제든 LINE을 연결할 수 있어요." }],
  completionTipsMarketplace: [{ title: "새 주문을 바로 확인", body: "브랜드의 주문이나 의뢰가 도착하면 LINE으로 알려 드려요." }, { title: "채팅과 수정 요청도 놓치지 않기", body: "협업 중 확인 사항과 수정 요청을 빠르게 확인할 수 있어요." }, { title: "프로필은 언제든 수정 가능", body: "PR 메뉴를 더 추가하면 브랜드의 선택을 받을 기회가 늘어나요." }],
  progress: (current, total) => `${total}단계 중 ${current}단계`, socialItem: (index) => `소셜 계정 ${index}`, menuItem: (index) => `PR 메뉴 ${index}`, oauthConnectedAccount: (email) => `Google 계정 연결 완료: ${email}`, lineLinkedAccount: (name) => `LINE 알림 연결 완료: ${name}`, portfolioImageAlt: (index) => `포트폴리오 사진 ${index}`,
};

const zhTW: CreatorSignupCopy = {
  ...ja,
  uiLanguage: "介面語言", countrySelectionTitle: "請選擇主要活動國家／地區", countrySelectionBody: "系統會依照你的選擇設定初始介面語言，之後可隨時從右上角切換。", displayTitle: "基本資料", displayBody: "這些資料之後都可以修改。", displayName: "創作者名稱", displayNamePlaceholder: "例如：Yuna Beauty", country: "活動國家／地區", gender: "性別", birthDate: "出生日期",
  accountTitle: "建立帳號", accountBody: "使用 Google 帳號或電子郵件完成註冊。", oauthConnected: "已連結 Google 帳號", email: "電子郵件", password: "密碼（至少 8 個字元）", passwordConfirm: "再次輸入密碼", passwordLengthOk: "至少 8 個字元", passwordMatch: "密碼一致", passwordMismatch: "兩次輸入的密碼不一致", signUpWithGoogle: "使用 Google 繼續", orText: "或",
  lineSetupTitle: "設定 LINE 通知", lineSetupBody: "透過 LINE 接收新訂單、訊息、修改要求與交件確認。", lineSetupBadge: "建議設定", lineSetupHeadline: "設定 LINE 通知，不錯過新的合作機會", lineSetupLead: "點選按鈕後會前往 LINE。完成授權後，系統會自動返回 Trend Mart 並完成連結。", lineBenefitOrder: "新訂單送達時立即通知", lineBenefitChat: "即時掌握訊息與修改要求", lineBenefitPrivate: "LINE 好友與品牌都不會看到此設定", lineStepAdd: "1. 開啟 Trend Mart 官方 LINE", lineStepSend: "2. 傳送連結代碼", lineStepDone: "3. 完成連結", lineCodeLabel: "連結代碼", lineCodeHelp: "請將這組代碼傳送至 Trend Mart 官方 LINE 聊天室。", lineOpenButton: "接收 LINE 通知", lineCopyCode: "複製代碼", lineCopied: "已複製代碼", lineRefreshCode: "取得新代碼", lineCheckStatus: "確認連結狀態", lineChecking: "確認中...", lineCreateCode: "取得連結代碼", lineCreatingCode: "產生中...", lineSkip: "稍後設定", lineContinue: "繼續", lineLinkedTitle: "LINE 通知設定完成", lineLinkedBody: "現在起，你可以透過 LINE 接收新訂單與重要通知。", lineUnlinkedMessage: "目前尚未完成連結。請先將代碼傳送至官方 LINE 聊天室，再重新確認。", lineOfficialMissing: "尚未設定官方 LINE 網址。請確認 NEXT_PUBLIC_LINE_OFFICIAL_URL。", lineCodeFailed: "無法產生 LINE 連結代碼，請稍後再試。",
  categoryTitle: "內容類別", categoryBody: "請選擇最多 5 個你擅長的內容類別。", categoryCount: "已選擇", areaTitle: "可合作地區", areaBody: "請選擇所有可前往拍攝或體驗合作的地區。", nonJapanAreaTitle: "商品寄送合作", nonJapanAreaBody: "請選擇是否接受品牌寄送商品進行合作。", prefecture: "可合作地區", selectPrefecture: "可複選", productPr: "商品寄送合作", productPrYes: "可以收取商品並進行合作", productPrNo: "暫不接受商品寄送合作",
  socialTitle: "社群帳號", socialBody: "請新增至少一個可供品牌查看的社群帳號。", platform: "社群平台", socialHandle: "使用者名稱", followerRange: "粉絲人數", audienceCountry: "主要粉絲所在國家／地區", urlPreview: "連結預覽", addSocial: "新增社群帳號", remove: "刪除",
  imagesTitle: "個人檔案照片", imagesBody: "請上傳 1 張個人檔案照片，以及至少 3 張作品集照片。", avatar: "個人檔案照片", avatarHelp: "調整照片位置，確認在圓形頭像中能清楚顯示。", avatarChoose: "選擇照片", portfolio: "作品集照片", portfolioHelp: "請選擇至少 3 張能呈現風格與作品質感的照片。", portfolioChoose: "新增照片",
  menuTitle: "PR 服務", menuBody: "請建立至少一項可供品牌委託的 PR 服務。", nonPaidMarketplaceTitle: "確認註冊資料", nonPaidMarketplaceBody: "韓國與台灣在 V1 暫不提供付費方案功能。完成個人檔案與社群帳號後即可公開。", menuType: "PR 類型", customMenuName: "PR 服務名稱", customMenuPlaceholder: "例如：Instagram 直播", priceLabel: "金額（日圓）", price: "例如：11,000", minimumPrice: "請輸入 3,000 日圓以上的金額", addMenu: "新增 PR 服務",
  termsTitle: "確認並同意", termsLabel: "我同意使用條款", privacyLabel: "我同意隱私權政策", termsLink: "使用條款", privacyLink: "隱私權政策", continue: "下一步", back: "返回", finish: "完成註冊", loading: "處理中...", preparing: "正在準備個人檔案...", preparingTitle: "正在建立你的個人檔案", preparingBody: "快完成了！所有資料之後都可以修改；新增更多 PR 服務，也能增加被品牌看見的機會。", nonPaidPreparingBody: "快完成了！個人檔案與社群帳號之後仍可修改。", selectPlease: "請選擇", login: "登入", reset: "重新開始",
  displayNameRequired: "請輸入創作者名稱", genderRequired: "請選擇性別", birthDateRequired: "請選擇出生日期", ageRequired: "年滿 18 歲才能註冊", emailRequired: "請輸入電子郵件", emailInvalid: "請輸入有效的電子郵件", passwordRequired: "密碼至少需要 8 個字元", passwordConfirmRequired: "請再次輸入密碼", passwordMismatchError: "兩次輸入的密碼不一致", categoryRequired: "請至少選擇一個內容類別", categoryLimit: "最多可選擇 5 個內容類別", areaRequired: "請至少選擇一個可合作地區", productPrRequired: "請選擇是否接受商品寄送合作", socialRequired: "請至少新增一個有效的社群帳號", avatarRequired: "請上傳個人檔案照片", portfolioRequired: "請上傳至少 3 張作品集照片", menuRequired: "請至少新增一項有效的 PR 服務", customMenuNameRequired: "請輸入 PR 服務名稱", termsRequired: "請同意使用條款與隱私權政策", signupFailed: "無法完成註冊", existingEmailSignInFailed: "此電子郵件已註冊。請確認原本設定的密碼，或使用其他電子郵件。", companyAccountConflict: "此電子郵件已用於企業帳號。請使用其他帳號註冊成為創作者。", imageUploadFailed: "照片上傳失敗", sessionMissing: "建立帳號後無法確認登入狀態。Supabase Auth 可能已啟用電子郵件驗證。",
  socialNoAt: "不需要輸入 @", socialHandleGuide: "請輸入頻道代號", socialUsernameGuide: "請輸入使用者名稱", socialUrlGuide: "請輸入網址", socialSelectGuide: "請選擇社群平台", socialUsernamePlaceholder: "使用者名稱", notSelected: "尚未選擇",
  registrationSavedCreatorOnly: "註冊完成", registrationSavedMarketplace: "註冊資料已儲存", completionHeadlineCreatorOnly: "透過 LINE 接收新的合作通知", completionHeadlineMarketplace: "再完成一個步驟，就能開始接收訂單", completionLeadCreatorOnly: "新的合作詢問與重要通知會透過 LINE 傳送給你，也可以之後再到個人檔案完成連結。", completionLeadMarketplace: "若要接收訂單，需要先開啟 LINE 通知。現在完成連結，就不會錯過新訂單、訊息、修改要求或交件確認。", lineOpening: "正在開啟 LINE...", lineConnect: "連結 LINE", lineSetLater: "稍後設定", completionPrivacyCreatorOnly: "LINE 連結為選填，也可以之後再到個人檔案設定。", completionPrivacyMarketplace: "你的 LINE 通知設定不會顯示給 LINE 好友或品牌。", completionAsideTitleCreatorOnly: "LINE 通知", completionAsideTitleMarketplace: "完成通知設定", completionAsideBodyCreatorOnly: "即時接收合作詢問與重要通知", completionAsideBodyMarketplace: "接收合作期間所需的重要通知",
  completionTipsCreatorOnly: [{ title: "不錯過合作詢問", body: "Trendre Link 收到新的合作詢問時，可透過 LINE 立即查看。" }, { title: "重要通知集中接收", body: "後續的重要通知也會傳送至同一個 LINE 帳號。" }, { title: "之後再設定也可以", body: "隨時都能從個人檔案連結 LINE。" }],
  completionTipsMarketplace: [{ title: "立即收到新訂單通知", body: "品牌送出訂單或合作邀約時，LINE 會立即通知你。" }, { title: "掌握訊息與修改要求", body: "合作期間的確認事項與修改要求都能即時查看。" }, { title: "個人檔案可隨時修改", body: "新增更多 PR 服務，能增加被品牌選中的機會。" }],
  progress: (current, total) => `第 ${current} 步，共 ${total} 步`, socialItem: (index) => `社群帳號 ${index}`, menuItem: (index) => `PR 服務 ${index}`, oauthConnectedAccount: (email) => `已連結 Google 帳號：${email}`, lineLinkedAccount: (name) => `LINE 通知連結完成：${name}`, portfolioImageAlt: (index) => `作品集照片 ${index}`,
};

export const creatorSignupDictionary = { ja, en, ko, "zh-TW": zhTW } satisfies Record<AppLocale, CreatorSignupCopy>;

export const creatorSignupStepTitles: Record<AppLocale, readonly string[]> = {
  ja: ["基本", "ログイン", "ジャンル", "エリア", "SNS", "写真", "メニュー"],
  en: ["Basic", "Login", "Categories", "Area", "Socials", "Images", "Menus"],
  ko: ["기본", "계정", "카테고리", "지역", "소셜", "사진", "PR 메뉴"],
  "zh-TW": ["基本", "帳號", "類別", "地區", "社群", "照片", "PR 服務"],
};

export const creatorSignupGenderLabels: Record<AppLocale, Record<string, string>> = {
  ja: { "": "選択", 女性: "女性", 男性: "男性", その他: "その他" },
  en: { "": "Select", 女性: "Female", 男性: "Male", その他: "Other" },
  ko: { "": "선택", 女性: "여성", 男性: "남성", その他: "기타" },
  "zh-TW": { "": "請選擇", 女性: "女性", 男性: "男性", その他: "其他" },
};

export const creatorSignupGenreLabels: Record<AppLocale, Record<string, string>> = {
  ja: { beauty: "美容", fitness: "健康", food: "グルメ", travel: "旅行", life: "暮らし", creative: "制作" },
  en: { beauty: "Beauty", fitness: "Fitness", food: "Food", travel: "Travel", life: "Lifestyle", creative: "Creative" },
  ko: { beauty: "뷰티", fitness: "건강·운동", food: "푸드", travel: "여행", life: "라이프", creative: "콘텐츠 제작" },
  "zh-TW": { beauty: "美妝保養", fitness: "健康運動", food: "美食", travel: "旅遊", life: "生活風格", creative: "內容創作" },
};

const enCategories: Record<string, string> = {
  美容サロン: "Beauty salon", 美容室: "Hair salon", 美容整形: "Cosmetic surgery", 美容医療: "Aesthetic medicine", スキンケア: "Skincare", コスメ: "Cosmetics", 韓国コスメ: "K-beauty", ヘアケア: "Hair care", ネイル: "Nails", "まつ毛・眉毛": "Lashes & brows", 香水: "Fragrance", メンズ美容: "Men's beauty",
  ジム: "Gym", パーソナルジム: "Personal training", ヨガ: "Yoga", ピラティス: "Pilates", ダイエット: "Weight management", 筋トレ: "Strength training", ランニング: "Running", スポーツウェア: "Sportswear", 健康食品: "Health foods", プロテイン: "Protein", サウナ: "Sauna", "整体・ストレッチ": "Bodywork & stretching",
  カフェ: "Cafes", レストラン: "Restaurants", 居酒屋: "Izakaya", スイーツ: "Desserts", 大食い: "Food challenges", お酒: "Drinks", 料理: "Cooking", 節約レシピ: "Budget recipes", 時短レシピ: "Quick recipes", お取り寄せ: "Food delivery", 食品レビュー: "Food reviews", ヴィーガン: "Vegan",
  国内旅行: "Domestic travel", 海外旅行: "International travel", ホテル: "Hotels", 旅館: "Ryokan", 観光地: "Destinations", 温泉: "Hot springs", グランピング: "Glamping", テーマパーク: "Theme parks", インバウンド: "Inbound travel", 地方PR: "Regional promotion", 街歩き: "City walks", カップル旅行: "Couples travel",
  ファッション: "Fashion", インテリア: "Interiors", 雑貨: "Lifestyle goods", ガジェット: "Gadgets", ペット: "Pets", 子育て: "Parenting", 家事: "Home care", 暮らし: "Daily life", 節約: "Saving money", 勉強: "Learning", 仕事術: "Productivity", Vlog: "Vlog",
  写真撮影: "Photography", 動画制作: "Video production", UGC制作: "UGC production", 商品レビュー: "Product reviews", 開封動画: "Unboxing", ライブ配信: "Live streaming", イベント体験: "Event experiences", モデル: "Modeling", ダンス: "Dance", 音楽: "Music", イラスト: "Illustration", その他: "Other",
};

const koCategories: Record<string, string> = {
  美容サロン: "뷰티 살롱", 美容室: "헤어 살롱", 美容整形: "성형", 美容医療: "미용 의료", スキンケア: "스킨케어", コスメ: "화장품", 韓国コスメ: "K-뷰티", ヘアケア: "헤어 케어", ネイル: "네일", "まつ毛・眉毛": "속눈썹·눈썹", 香水: "향수", メンズ美容: "남성 뷰티",
  ジム: "피트니스", パーソナルジム: "퍼스널 트레이닝", ヨガ: "요가", ピラティス: "필라테스", ダイエット: "다이어트", 筋トレ: "근력 운동", ランニング: "러닝", スポーツウェア: "스포츠웨어", 健康食品: "건강식품", プロテイン: "단백질 보충제", サウナ: "사우나", "整体・ストレッチ": "체형 관리·스트레칭",
  カフェ: "카페", レストラン: "레스토랑", 居酒屋: "이자카야", スイーツ: "디저트", 大食い: "먹방", お酒: "주류", 料理: "요리", 節約レシピ: "알뜰 레시피", 時短レシピ: "간편 레시피", お取り寄せ: "온라인 식품", 食品レビュー: "식품 리뷰", ヴィーガン: "비건",
  国内旅行: "국내 여행", 海外旅行: "해외 여행", ホテル: "호텔", 旅館: "료칸", 観光地: "관광지", 温泉: "온천", グランピング: "글램핑", テーマパーク: "테마파크", インバウンド: "일본 인바운드", 地方PR: "지역 홍보", 街歩き: "도시 산책", カップル旅行: "커플 여행",
  ファッション: "패션", インテリア: "인테리어", 雑貨: "생활용품", ガジェット: "디지털 기기", ペット: "반려동물", 子育て: "육아", 家事: "살림", 暮らし: "라이프스타일", 節約: "절약", 勉強: "공부", 仕事術: "업무 노하우", Vlog: "브이로그",
  写真撮影: "사진 촬영", 動画制作: "영상 제작", UGC制作: "UGC 제작", 商品レビュー: "제품 리뷰", 開封動画: "언박싱 영상", ライブ配信: "라이브 방송", イベント体験: "이벤트 체험", モデル: "모델", ダンス: "댄스", 音楽: "음악", イラスト: "일러스트", その他: "기타",
};

const zhTWCategories: Record<string, string> = {
  美容サロン: "美容沙龍", 美容室: "髮廊", 美容整形: "醫美整形", 美容医療: "醫美療程", スキンケア: "肌膚保養", コスメ: "彩妝", 韓国コスメ: "韓系美妝", ヘアケア: "美髮保養", ネイル: "美甲", "まつ毛・眉毛": "美睫與眉型", 香水: "香水", メンズ美容: "男性保養",
  ジム: "健身房", パーソナルジム: "私人教練", ヨガ: "瑜伽", ピラティス: "皮拉提斯", ダイエット: "體態管理", 筋トレ: "重量訓練", ランニング: "跑步", スポーツウェア: "運動服飾", 健康食品: "保健食品", プロテイン: "蛋白補充品", サウナ: "三溫暖", "整体・ストレッチ": "身體調理與伸展",
  カフェ: "咖啡廳", レストラン: "餐廳", 居酒屋: "居酒屋", スイーツ: "甜點", 大食い: "大胃王", お酒: "酒類", 料理: "料理", 節約レシピ: "省錢食譜", 時短レシピ: "快速料理", お取り寄せ: "宅配美食", 食品レビュー: "食品評測", ヴィーガン: "純素飲食",
  国内旅行: "日本國內旅遊", 海外旅行: "海外旅遊", ホテル: "飯店", 旅館: "日式旅館", 観光地: "觀光景點", 温泉: "溫泉", グランピング: "豪華露營", テーマパーク: "主題樂園", インバウンド: "日本入境旅遊", 地方PR: "地方宣傳", 街歩き: "城市散步", カップル旅行: "情侶旅遊",
  ファッション: "時尚穿搭", インテリア: "居家設計", 雑貨: "生活雜貨", ガジェット: "3C 產品", ペット: "寵物", 子育て: "親子育兒", 家事: "居家生活", 暮らし: "生活風格", 節約: "省錢生活", 勉強: "學習", 仕事術: "工作效率", Vlog: "Vlog",
  写真撮影: "攝影", 動画制作: "影片製作", UGC制作: "UGC 製作", 商品レビュー: "商品評測", 開封動画: "開箱影片", ライブ配信: "直播", イベント体験: "活動體驗", モデル: "模特兒", ダンス: "舞蹈", 音楽: "音樂", イラスト: "插畫", その他: "其他",
};

export const creatorSignupCategoryLabels: Record<AppLocale, Record<string, string>> = {
  ja: {}, en: enCategories, ko: koCategories, "zh-TW": zhTWCategories,
};

export const creatorSignupAudienceCountryLabels: Record<AppLocale, Record<string, string>> = {
  ja: {},
  en: { 日本: "Japan", 韓国: "Korea", 台湾: "Taiwan", 香港: "Hong Kong", 中国: "China", タイ: "Thailand", ベトナム: "Vietnam", インドネシア: "Indonesia", フィリピン: "Philippines", マレーシア: "Malaysia", シンガポール: "Singapore", インド: "India", アメリカ: "United States", カナダ: "Canada", イギリス: "United Kingdom", フランス: "France", ドイツ: "Germany", オーストラリア: "Australia", その他: "Other" },
  ko: { 日本: "일본", 韓国: "대한민국", 台湾: "대만", 香港: "홍콩", 中国: "중국", タイ: "태국", ベトナム: "베트남", インドネシア: "인도네시아", フィリピン: "필리핀", マレーシア: "말레이시아", シンガポール: "싱가포르", インド: "인도", アメリカ: "미국", カナダ: "캐나다", イギリス: "영국", フランス: "프랑스", ドイツ: "독일", オーストラリア: "호주", その他: "기타" },
  "zh-TW": { 日本: "日本", 韓国: "韓國", 台湾: "台灣", 香港: "香港", 中国: "中國", タイ: "泰國", ベトナム: "越南", インドネシア: "印尼", フィリピン: "菲律賓", マレーシア: "馬來西亞", シンガポール: "新加坡", インド: "印度", アメリカ: "美國", カナダ: "加拿大", イギリス: "英國", フランス: "法國", ドイツ: "德國", オーストラリア: "澳洲", その他: "其他" },
};

export const creatorSignupFollowerRangeLabels: Record<AppLocale, Record<string, string>> = {
  ja: {},
  en: { "1,000未満": "Under 1,000", "1,000〜5,000": "1,000–5,000", "5,000〜10,000": "5,000–10,000", "10,000〜30,000": "10,000–30,000", "30,000〜50,000": "30,000–50,000", "50,000〜100,000": "50,000–100,000", "100,000〜300,000": "100,000–300,000", "300,000〜500,000": "300,000–500,000", "500,000〜1,000,000": "500,000–1,000,000", "1,000,000以上": "1,000,000+" },
  ko: { "1,000未満": "1,000명 미만", "1,000〜5,000": "1,000~5,000명", "5,000〜10,000": "5,000~10,000명", "10,000〜30,000": "1만~3만 명", "30,000〜50,000": "3만~5만 명", "50,000〜100,000": "5만~10만 명", "100,000〜300,000": "10만~30만 명", "300,000〜500,000": "30만~50만 명", "500,000〜1,000,000": "50만~100만 명", "1,000,000以上": "100만 명 이상" },
  "zh-TW": { "1,000未満": "少於 1,000 人", "1,000〜5,000": "1,000～5,000 人", "5,000〜10,000": "5,000～10,000 人", "10,000〜30,000": "1 萬～3 萬人", "30,000〜50,000": "3 萬～5 萬人", "50,000〜100,000": "5 萬～10 萬人", "100,000〜300,000": "10 萬～30 萬人", "300,000〜500,000": "30 萬～50 萬人", "500,000〜1,000,000": "50 萬～100 萬人", "1,000,000以上": "100 萬人以上" },
};

export type CreatorSignupMenuCopy = { label: string; help: string };
export const creatorSignupMenuCopy: Record<AppLocale, Record<string, CreatorSignupMenuCopy>> = {
  ja: {
    Instagram投稿: { label: "Instagram\nフィード", help: "Instagramのフィード投稿として紹介します。" }, Instagramリール: { label: "Instagram\nリール", help: "Instagramリール動画として投稿します。" }, Instagramストーリーズ: { label: "Instagram\nストーリーズ", help: "Instagramストーリーズで紹介します。" }, TikTok投稿: { label: "TikTok\n投稿", help: "TikTok動画として投稿します。" }, YouTubeショート: { label: "YouTube\nショート", help: "YouTube Shortsとして投稿します。" }, YouTube動画: { label: "YouTube\n動画", help: "YouTube動画として投稿します。" }, "投稿なし・動画素材のみ納品": { label: "UGC\n動画素材納品", help: "広告やSNSで使える動画素材だけを納品します。" }, "投稿なし・写真素材のみ納品": { label: "UGC\n写真素材納品", help: "広告やSNSで使える写真素材だけを納品します。" }, イベント訪問: { label: "イベント\n訪問", help: "店舗・イベント・展示会などに訪問して投稿または素材制作を行います。" }, その他: { label: "その他", help: "上記以外のメニューです。" },
  },
  en: {
    Instagram投稿: { label: "Instagram\nFeed post", help: "A feed post published on Instagram." }, Instagramリール: { label: "Instagram\nReel", help: "A short-form video published as an Instagram Reel." }, Instagramストーリーズ: { label: "Instagram\nStories", help: "A story placement published on Instagram." }, TikTok投稿: { label: "TikTok\nVideo", help: "A video published on TikTok." }, YouTubeショート: { label: "YouTube\nShort", help: "A short-form video published on YouTube Shorts." }, YouTube動画: { label: "YouTube\nVideo", help: "A video published on YouTube." }, "投稿なし・動画素材のみ納品": { label: "UGC\nVideo asset only", help: "Deliver video assets only. You do not post on your own account." }, "投稿なし・写真素材のみ納品": { label: "UGC\nPhoto asset only", help: "Deliver photo assets only. You do not post on your own account." }, イベント訪問: { label: "Event\nVisit", help: "Visit an event, store, or location for content creation." }, その他: { label: "Other", help: "Use this for custom services." },
  },
  ko: {
    Instagram投稿: { label: "Instagram\n피드 게시물", help: "Instagram 피드 게시물로 브랜드를 소개합니다." }, Instagramリール: { label: "Instagram\n릴스", help: "Instagram 릴스 영상으로 소개합니다." }, Instagramストーリーズ: { label: "Instagram\n스토리", help: "Instagram 스토리로 소개합니다." }, TikTok投稿: { label: "TikTok\n영상", help: "TikTok 영상으로 소개합니다." }, YouTubeショート: { label: "YouTube\nShorts", help: "YouTube Shorts 영상으로 소개합니다." }, YouTube動画: { label: "YouTube\n영상", help: "YouTube 영상으로 소개합니다." }, "投稿なし・動画素材のみ納品": { label: "UGC\n영상 납품", help: "본인 계정에는 게시하지 않고 광고나 소셜 채널에 사용할 영상만 납품합니다." }, "投稿なし・写真素材のみ納品": { label: "UGC\n사진 납품", help: "본인 계정에는 게시하지 않고 광고나 소셜 채널에 사용할 사진만 납품합니다." }, イベント訪問: { label: "이벤트\n방문", help: "매장, 이벤트 또는 전시회를 방문해 콘텐츠를 제작합니다." }, その他: { label: "기타", help: "목록에 없는 맞춤 PR 서비스입니다." },
  },
  "zh-TW": {
    Instagram投稿: { label: "Instagram\n貼文", help: "以 Instagram 動態貼文介紹品牌或商品。" }, Instagramリール: { label: "Instagram\nReels", help: "以 Instagram Reels 短影音介紹品牌或商品。" }, Instagramストーリーズ: { label: "Instagram\n限時動態", help: "以 Instagram 限時動態介紹品牌或商品。" }, TikTok投稿: { label: "TikTok\n影片", help: "製作並發布 TikTok 影片。" }, YouTubeショート: { label: "YouTube\nShorts", help: "製作並發布 YouTube Shorts 短影音。" }, YouTube動画: { label: "YouTube\n影片", help: "製作並發布 YouTube 影片。" }, "投稿なし・動画素材のみ納品": { label: "UGC\n影片素材", help: "不發布至自己的帳號，僅交付可供廣告或社群使用的影片素材。" }, "投稿なし・写真素材のみ納品": { label: "UGC\n照片素材", help: "不發布至自己的帳號，僅交付可供廣告或社群使用的照片素材。" }, イベント訪問: { label: "活動\n到訪", help: "前往店家、活動或展覽，製作貼文或影像素材。" }, その他: { label: "其他", help: "提供列表以外的客製 PR 服務。" },
  },
};

export const creatorSignupAvatarCropCopy: Record<AppLocale, Record<"empty" | "adjustOrChange" | "title" | "body" | "close" | "preview" | "gesture" | "back" | "cropping" | "confirm", string>> = {
  ja: { empty: "アイコン", adjustOrChange: "写真を調整・変更", title: "プロフィール写真を調整", body: "丸いアイコンに入る位置を確認してから確定してください。", close: "閉じる", preview: "プロフィール写真の切り抜きプレビュー", gesture: "ドラッグで位置調整・ピンチで拡大／縮小", back: "戻る", cropping: "調整中...", confirm: "この位置で確定" },
  en: { empty: "Icon", adjustOrChange: "Adjust or change", title: "Adjust profile photo", body: "Position the photo inside the round profile icon, then confirm.", close: "Close", preview: "Profile photo crop preview", gesture: "Drag to move. Pinch or scroll to zoom.", back: "Back", cropping: "Cropping...", confirm: "Use this crop" },
  ko: { empty: "프로필", adjustOrChange: "사진 조정·변경", title: "프로필 사진 조정", body: "원형 프로필에 잘 보이도록 위치를 맞춘 뒤 확인해 주세요.", close: "닫기", preview: "프로필 사진 자르기 미리 보기", gesture: "드래그로 이동하고 핀치 또는 스크롤로 확대·축소", back: "이전", cropping: "조정 중...", confirm: "이 위치로 적용" },
  "zh-TW": { empty: "頭像", adjustOrChange: "調整或更換照片", title: "調整個人檔案照片", body: "確認照片在圓形頭像中的位置後再套用。", close: "關閉", preview: "個人檔案照片裁切預覽", gesture: "拖曳調整位置，雙指縮放或捲動調整大小", back: "返回", cropping: "調整中...", confirm: "套用這個位置" },
};

export const creatorSignupPrefectureLabels: Record<AppLocale, Record<string, string>> = {
  ja: {},
  en: { 北海道: "Hokkaido", 青森県: "Aomori", 岩手県: "Iwate", 宮城県: "Miyagi", 秋田県: "Akita", 山形県: "Yamagata", 福島県: "Fukushima", 茨城県: "Ibaraki", 栃木県: "Tochigi", 群馬県: "Gunma", 埼玉県: "Saitama", 千葉県: "Chiba", 東京都: "Tokyo", 神奈川県: "Kanagawa", 新潟県: "Niigata", 富山県: "Toyama", 石川県: "Ishikawa", 福井県: "Fukui", 山梨県: "Yamanashi", 長野県: "Nagano", 岐阜県: "Gifu", 静岡県: "Shizuoka", 愛知県: "Aichi", 三重県: "Mie", 滋賀県: "Shiga", 京都府: "Kyoto", 大阪府: "Osaka", 兵庫県: "Hyogo", 奈良県: "Nara", 和歌山県: "Wakayama", 鳥取県: "Tottori", 島根県: "Shimane", 岡山県: "Okayama", 広島県: "Hiroshima", 山口県: "Yamaguchi", 徳島県: "Tokushima", 香川県: "Kagawa", 愛媛県: "Ehime", 高知県: "Kochi", 福岡県: "Fukuoka", 佐賀県: "Saga", 長崎県: "Nagasaki", 熊本県: "Kumamoto", 大分県: "Oita", 宮崎県: "Miyazaki", 鹿児島県: "Kagoshima", 沖縄県: "Okinawa" },
  ko: { 北海道: "홋카이도", 青森県: "아오모리", 岩手県: "이와테", 宮城県: "미야기", 秋田県: "아키타", 山形県: "야마가타", 福島県: "후쿠시마", 茨城県: "이바라키", 栃木県: "도치기", 群馬県: "군마", 埼玉県: "사이타마", 千葉県: "지바", 東京都: "도쿄", 神奈川県: "가나가와", 新潟県: "니가타", 富山県: "도야마", 石川県: "이시카와", 福井県: "후쿠이", 山梨県: "야마나시", 長野県: "나가노", 岐阜県: "기후", 静岡県: "시즈오카", 愛知県: "아이치", 三重県: "미에", 滋賀県: "시가", 京都府: "교토", 大阪府: "오사카", 兵庫県: "효고", 奈良県: "나라", 和歌山県: "와카야마", 鳥取県: "돗토리", 島根県: "시마네", 岡山県: "오카야마", 広島県: "히로시마", 山口県: "야마구치", 徳島県: "도쿠시마", 香川県: "가가와", 愛媛県: "에히메", 高知県: "고치", 福岡県: "후쿠오카", 佐賀県: "사가", 長崎県: "나가사키", 熊本県: "구마모토", 大分県: "오이타", 宮崎県: "미야자키", 鹿児島県: "가고시마", 沖縄県: "오키나와" },
  "zh-TW": { 北海道: "北海道", 青森県: "青森縣", 岩手県: "岩手縣", 宮城県: "宮城縣", 秋田県: "秋田縣", 山形県: "山形縣", 福島県: "福島縣", 茨城県: "茨城縣", 栃木県: "栃木縣", 群馬県: "群馬縣", 埼玉県: "埼玉縣", 千葉県: "千葉縣", 東京都: "東京都", 神奈川県: "神奈川縣", 新潟県: "新潟縣", 富山県: "富山縣", 石川県: "石川縣", 福井県: "福井縣", 山梨県: "山梨縣", 長野県: "長野縣", 岐阜県: "岐阜縣", 静岡県: "靜岡縣", 愛知県: "愛知縣", 三重県: "三重縣", 滋賀県: "滋賀縣", 京都府: "京都府", 大阪府: "大阪府", 兵庫県: "兵庫縣", 奈良県: "奈良縣", 和歌山県: "和歌山縣", 鳥取県: "鳥取縣", 島根県: "島根縣", 岡山県: "岡山縣", 広島県: "廣島縣", 山口県: "山口縣", 徳島県: "德島縣", 香川県: "香川縣", 愛媛県: "愛媛縣", 高知県: "高知縣", 福岡県: "福岡縣", 佐賀県: "佐賀縣", 長崎県: "長崎縣", 熊本県: "熊本縣", 大分県: "大分縣", 宮崎県: "宮崎縣", 鹿児島県: "鹿兒島縣", 沖縄県: "沖繩縣" },
};

export function localizeCreatorSignupValue(locale: AppLocale, value: string, labels: Record<AppLocale, Record<string, string>>) {
  return labels[locale][value] ?? value;
}
