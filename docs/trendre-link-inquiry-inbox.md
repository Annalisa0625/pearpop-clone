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

- `new`: 新着
- `read`: 確認済み
- `considering`: 検討中
- `replied`: 返信済み
- `quoted`: 見積もり送信済み
- `accepted`: 成約
- `declined`: 辞退
- `closed`: 完了

詳細を初めて開いた際、`new`は`read`へ更新されます。

## Preview確認項目

1. 公開Linkからテスト問い合わせを1件送信する
2. `/creator/link`の「仕事相談」に新着件数が表示される
3. 一覧の「新着」に相談が表示される
4. 詳細を開くと入力内容が表示され、新着件数が減る
5. 「メールで返信」から宛先・件名が入ったメール作成画面へ進む
6. 対応状況を変更し、一覧へ戻って反映を確認する
7. 別ユーザーの問い合わせIDへ直接アクセスしても表示・更新できない

## 次フェーズ

- サービス内での見積もり作成・送信
- 未登録企業のTrend Martアカウント取り込み
- 問い合わせからTrend Mart案件・注文への変換
- LINE通知
