# ハイブリッド構成デプロイメントガイド

このガイドでは、Vercel と Supabase Edge Functions を組み合わせたハイブリッド構成のデプロイ方法を説明します。

## アーキテクチャ概要

```
フロントエンド (Vercel)
     ↓
     ├─ Vercel API (軽量処理)
     │  ├─ POST /interview/start
     │  ├─ POST /interview/message
     │  ├─ POST /interview/end
     │  ├─ GET  /interview/history
     │  ├─ GET  /interview/transcript/:id
     │  └─ GET  /interview/session/:id
     │
     ├─ Supabase Edge Functions (重い分析処理)
     │  ├─ POST /analyze
     │  ├─ POST /analyze-message
     │  └─ POST /finalize-analysis
     │
     └─ Supabase Database (セッションデータ保存)
```

## メリット

- ✅ **タイムアウト回避**: 分析処理は150秒まで実行可能（Vercel Hobbyは10秒）
- ✅ **コスト最適化**: Vercel Proプラン不要
- ✅ **データ永続化**: セッションデータをSupabase DBで管理
- ✅ **段階的移行**: 既存のVercelデプロイメントを活かしながら拡張

---

## デプロイ手順

### 1. Supabaseプロジェクトのセットアップ

#### 1.1 Supabaseアカウント作成とプロジェクト作成

1. https://supabase.com にアクセスしてアカウント作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGc...`（公開鍵）
   - **Service Role Key**: `eyJhbGc...`（管理用秘密鍵）

#### 1.2 データベーステーブルの作成

1. Supabaseダッシュボードの **SQL Editor** を開く
2. `supabase/migrations/20260419_create_interview_tables.sql` の内容をコピー
3. SQLエディタに貼り付けて実行

確認方法:
```sql
-- テーブルが作成されたか確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 以下のテーブルが表示されればOK:
-- - interview_sessions
-- - chat_messages
-- - message_analyses
-- - analysis_results
```

#### 1.3 Edge Functionsのデプロイ

**必要なもの**:
- Supabase CLI (オプション - 手動デプロイも可能)

**方法1: Supabaseダッシュボードから手動デプロイ**

1. Supabaseダッシュボードの **Edge Functions** セクションを開く
2. 各関数を作成:
   - `analyze`
   - `analyze-message`
   - `finalize-analysis`
3. 各関数のコードを `supabase/functions/[関数名]/index.ts` からコピー＆ペースト
4. 環境変数を設定（後述）
5. デプロイ

**方法2: Supabase CLIを使う（推奨）**

```bash
# Supabase CLIをインストール（Homebrewの場合）
brew install supabase/tap/supabase

# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref your-project-id

# Edge Functionsをデプロイ
supabase functions deploy analyze
supabase functions deploy analyze-message
supabase functions deploy finalize-analysis

# シークレット（環境変数）を設定
supabase secrets set ANTHROPIC_API_KEY=your-api-key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

### 2. Vercel APIの環境変数設定

Vercelダッシュボードで以下の環境変数を追加:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
FRONTEND_URL=https://your-app.vercel.app
```

設定方法:
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 上記の環境変数を追加
3. Production, Preview, Development すべてにチェック
4. Redeploy（再デプロイ）

---

### 3. フロントエンドの環境変数設定

#### 3.1 本番環境（Vercel）

Vercelダッシュボードで以下を追加:

```
VITE_API_BASE_URL=https://your-app.vercel.app/api
VITE_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 3.2 ローカル開発環境

`frontend/.env.local` を作成:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 4. デプロイ

#### 4.1 Vercelへのデプロイ

```bash
# フロントエンドとAPIをビルド
npm run vercel-build

# Vercelにデプロイ
vercel --prod
```

または、GitHubと連携している場合は自動デプロイされます。

#### 4.2 動作確認

1. **フロントエンドアクセス**: https://your-app.vercel.app
2. **インタビュー開始**: テーマを選択して開始
3. **メッセージ送信**: 数往復やり取り
4. **分析実行**: 「分析する」ボタンをクリック
5. **結果確認**: 分析結果が表示されればOK

---

## トラブルシューティング

### エラー: "Session not found"

**原因**: Supabase DBにデータが保存されていない

**解決方法**:
1. Vercel APIの環境変数 `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を確認
2. Supabaseダッシュボードの **Table Editor** で `interview_sessions` テーブルにデータがあるか確認
3. Vercel APIのログを確認（Vercelダッシュボード → Logs）

### エラー: "Failed to analyze interview"

**原因**: Supabase Edge Functionsが正しくデプロイされていない、または環境変数が未設定

**解決方法**:
1. Supabaseダッシュボードの **Edge Functions** で関数がデプロイされているか確認
2. 関数のログを確認（Supabaseダッシュボード → Edge Functions → Logs）
3. 環境変数が正しく設定されているか確認:
   ```bash
   supabase secrets list
   ```

### エラー: "CORS error"

**原因**: Supabase Edge FunctionsのCORS設定が不適切

**解決方法**:
- `supabase/functions/*/index.ts` の `corsHeaders` を確認
- 必要に応じて `Access-Control-Allow-Origin` を特定のドメインに変更

### タイムアウトが発生する

**確認事項**:
1. フロントエンドが Supabase Edge Functions を呼び出しているか確認
   - ブラウザの開発者ツール → Network タブ
   - `/analyze` のリクエストURLを確認
   - 正: `https://xxxxx.supabase.co/functions/v1/analyze`
   - 誤: `https://your-app.vercel.app/api/interview/analyze`

2. Supabase Edge Functions のタイムアウト設定を確認（デフォルト150秒）

---

## ローカル開発

### Supabase Edge Functionsのローカル実行

```bash
# Supabaseローカル環境を起動
supabase start

# Edge Functionsをローカルで実行
supabase functions serve analyze --env-file ./supabase/.env.local

# 別のターミナルでテスト
curl -X POST http://localhost:54321/functions/v1/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"sessionId": "session_xxx"}'
```

### Vercel APIのローカル実行

```bash
# APIディレクトリに移動
cd api

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してSupabase情報を入力

# 開発サーバー起動
npm run dev
```

---

## コスト見積もり

### Supabase（無料プラン）
- ✅ Database: 500MB (十分)
- ✅ Edge Functions: 500,000 リクエスト/月
- ✅ 帯域幅: 5GB/月

### Vercel（Hobby プラン）
- ✅ サーバーレス関数: 10秒タイムアウト → OK（軽量処理のみ）
- ✅ ビルド時間: 6時間/月

**推定月額コスト**: $0（無料プランで十分）

---

## 次のステップ

1. **監視設定**: Supabase と Vercel のログ監視を設定
2. **エラー追跡**: Sentryなどのエラー追跡ツールを導入
3. **パフォーマンス最適化**: データベースインデックスの調整
4. **スケーリング**: トラフィック増加時の有料プランへの移行計画

---

## 参考リンク

- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli)
