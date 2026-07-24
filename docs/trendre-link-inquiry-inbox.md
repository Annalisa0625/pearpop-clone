# Trendre Link 仕事相談 Inbox

## 対象ルート

- `/creator/link/inquiries`: Trendre Link経由の仕事相談一覧
- `/creator/link/inquiries/[id]`: 仕事相談の詳細・対応状況更新
- `/api/creator/link/inquiries`: 認証済みクリエイター本人の一覧API
- `/api/creator/link/inquiries/[id]`: 本人所有の詳細取得・状態更新API

## 対象データ

既存の`creator_inquiries`を利用し、次の条件を満たす行だけを対象にします。

- `creator_user_id`が認証済みユーザーIDと一致
- `source = 'trendre_link'`

DB migrationや新規テーブルは追加しません。

## 対応状況

既存DBのチェック制約で許可されている値に合わせます。

- `new`: 新着・未対応
- `creator_reviewing`: 対応中
- `quoted`: 見積もり送信済み
- `converted`: 成約
- `declined`: 辞退

`new`は詳細を開いただけでは変更しません。クリエイターが「対応を始める」を押した時に`creator_reviewing`へ更新し、見落としを防ぎます。

メール返信後も、見積もりを送るまでは`creator_reviewing`として管理します。

## 表示変換

フォームでは依頼内容を固定キーで保存しますが、画面には利用者向けの名称で表示します。

- `pr_post`: PR投稿
- `ugc`: UGC制作
- `product_review`: 商品レビュー
- `visit_event`: 来店・体験
- `other`: その他

## Preview確認項目

1. 公開Linkからテスト問い合わせを1件送信する
2. 送信完了画面の見出しと説明が明瞭に表示される
3. `/creator/link`の「仕事相談」に新着件数が表示される
4. 一覧の「新着」に相談が表示される
5. 詳細で依頼内容が`pr_post`ではなく「PR投稿」と表示される
6. 「対応を始める」で`new`から`creator_reviewing`へ更新される
7. 一覧へ戻ると「新着」が0件、「対応中」が1件になる
8. 「メールで返信」から宛先・件名が入ったメール作成画面へ進む
9. 見積もり送信済み・成約・辞退へ状態を変更できる
10. 別ユーザーの問い合わせIDへ直接アクセスしても表示・更新できない

## 次フェーズ

- サービス内での見積もり作成・送信
- 未登録企業のTrend Martアカウント取り込み
- 問い合わせからTrend Mart案件・注文への変換
- LINE通知
