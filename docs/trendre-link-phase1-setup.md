# Trendre Link MVP Phase 1 導入手順

この手順では、Trendre Link用のテーブル・RLS・SQL関数をSupabaseへ追加し、APIを確認します。

> **重要:** SQLを適用する前にTrendre LinkのAPIを実行しないでください。必要なテーブルとSQL関数がまだ存在しないため、APIはエラーになります。

## 公開相談の保存経路

- 公開相談をブラウザのSupabaseクライアントから `creator_inquiries` へ直接INSERTしないでください。
- 既存のpublic_profile相談は `app/api/public/inquiries` を経由して保存します。
- Trendre Link相談は、今後実装する専用サーバーAPIを経由して保存します。
- どちらのサーバーAPIも入力を検証した後、サーバー限定のservice roleでINSERTします。service role keyをブラウザ、クライアントコード、curl例へ渡してはいけません。
- このSQLはanon/authenticatedへ新しい `creator_inquiries` INSERT権限を付与せず、新しいpermissive INSERTポリシーも作成しません。
- `trendre_link_inquiries_public_insert_guard` は、既存DBにINSERT権限やpermissiveポリシーが残っていた場合の追加防御です。guard自体はINSERTを許可するポリシーではありません。

## 1. 適用前に既存RLSを確認する

`creator_inquiries` は既存の公開相談機能と共有されています。SQLを適用する前に、SQL Editorで現在のRLS有効状態と既存ポリシーを確認し、結果を控えてください。

```sql
select relrowsecurity
from pg_class
where oid = 'public.creator_inquiries'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'creator_inquiries'
order by policyname;
```

このSQLファイルは `trendre_link` を含む名前のポリシーだけを再作成し、それ以外の既存ポリシーは削除しません。適用後にも同じ確認を行い、既存ポリシーが残っていることを確認します。

## 2. SQLを適用する

1. 対象プロジェクトのSupabase Dashboardを開きます。
2. 左メニューから **SQL Editor** を開きます。
3. このリポジトリの `docs/sql/trendre-link-phase1.sql` を開き、内容をすべてコピーします。
4. SQL Editorへ貼り付け、**Run** を押します。
5. エラーが表示されず、実行が完了したことを確認します。

SQLは既存の `creator_inquiries` を削除・再作成せず、必要なカラムとポリシーを追加します。既存の相談データは `verification_status = 'verified'` として扱われます。

## 3. DB型を再生成する

今回はビルド可能にするため `types/database.types.ts` を手動更新しています。SQL適用後は、Supabase CLIで実際のDB定義から再生成してください。

プロジェクトIDはSupabase Dashboardの **Project Settings > General** で確認できます。

```powershell
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > types/database.types.ts
```

`<PROJECT_ID>` は実際のProject IDに置き換えます。生成後は差分を確認し、新規3テーブル、`creator_inquiries` の追加カラム、`is_creator_link_slug_available` 関数が含まれることを確認してください。

型再生成後は、手動型のときだけでなく生成型でも問題がないことを確かめるため、もう一度buildを実行します。

```powershell
npm run build
```

## 4. production buildを確認する

リポジトリのルートで次を実行します。

```powershell
npm run build
```

エラーなくNext.jsのproduction buildが完了することを確認します。

## 5. APIを確認する

ローカルサーバーを起動します。

```powershell
npm run dev
```

### slug利用可否

ブラウザまたは別のターミナルから確認できます。

```powershell
curl.exe "http://localhost:3000/api/creator/link/slug-availability?slug=Luna_Official"
curl.exe "http://localhost:3000/api/creator/link/slug-availability?slug=admin"
```

1つ目は `normalizedSlug` が `luna-official` になります。2つ目は予約語なので `available: false`、`reason: "reserved"` になります。

`excludePageId` を使う場合は、そのページを所有するログインユーザーのアクセストークンが必要です。

```powershell
curl.exe "http://localhost:3000/api/creator/link/slug-availability?slug=luna&excludePageId=<PAGE_UUID>" -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"
```

### Linkページbootstrap

bootstrap APIは認証必須です。ブラウザでログイン済みならCookieセッションを利用できます。APIクライアントから試す場合はSupabaseのユーザー用access tokenを指定します。

```powershell
curl.exe -X POST "http://localhost:3000/api/creator/link/bootstrap" -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"
```

成功時は `ok: true` とともに、`page`、`items`、9件の `inquiryTypes` が返ります。同じユーザーで再実行すると既存データが返り、通常は `createdCreator: false`、`createdPage: false` になります。

`<SUPABASE_ACCESS_TOKEN>` にはログインユーザーのaccess tokenを使用します。service role keyはブラウザ、curl例、クライアントコードへ絶対に記載しないでください。

## 6. SQL適用後の手動確認

1. 既存Trend Martクリエイターでbootstrap APIを実行し、既存 `creators.is_public`、承認状態、Stripe状態、プロフィール完了状態が変わらないことを確認します。
2. `creators` がない認証ユーザーでbootstrap APIを実行し、`is_public = false` の最小creatorと、`status = 'draft'` のLinkページが1件ずつ作られることを確認します。
3. 同じユーザーでbootstrap APIを複数回実行し、creatorとLinkページが重複しないことを確認します。
4. 作成されたLinkページに9件の相談種別があり、すべて `is_enabled = false` であることを確認します。
5. 公開・非公開ページを用意し、anonでは `status = 'published'` のページと公開対象のitems・相談種別だけ取得できることを確認します。
6. 別ユーザーの `excludePageId` をslug APIへ渡した場合、除外が拒否されることを確認します。
7. 既存Trend Martクリエイターで、本人の `creators.public_slug` または `profiles.username` が他ユーザーと競合していなければ、その値がそのままLink slugに採用されることを確認します。
8. 別ユーザーの `creator_link_pages.slug`、`creators.public_slug`、`profiles.username` と同じ値を保存しようとした場合、API経由だけでなくDBの直接INSERT/UPDATEでも拒否されることを確認します。同じ本人の3テーブル間での共有は許可されることも確認します。
9. 既存の `/in/[slug]` 相談フォームから、未ログイン状態とログイン状態の両方で相談を送信し、従来どおり `status = 'new'`、`source = 'public_profile'`、`verification_status = 'verified'` として保存されることを必ず確認します。
10. Trendre Link相談では、公開中かつ受付中のページに属する有効な相談種別だけを送信できることを確認します。既存権限を持つ検証用ロールでguardを確認する場合も、別ページの相談種別、偽のタイトル、`quoted` / `converted`、converted関連ID、verification token関連値を指定した直接INSERTが拒否されることを確認します。
