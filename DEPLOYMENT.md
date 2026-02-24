# Vercelへのデプロイ手順

このプロジェクトをVercelにデプロイする手順です。

## 前提条件

- Vercelアカウント（https://vercel.com/signup）
- Anthropic API Key（https://console.anthropic.com/）

## デプロイ方法

### 方法1: Vercel CLI を使用（推奨）

1. **Vercel CLIをインストール**
   ```bash
   npm install -g vercel
   ```

2. **Vercelにログイン**
   ```bash
   vercel login
   ```

3. **プロジェクトをデプロイ**
   ```bash
   vercel
   ```
   初回デプロイ時は、プロジェクト名や設定を確認されます。

4. **環境変数を設定**
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```
   プロンプトに従って、API Keyを入力してください。
   環境は `Production` を選択してください。

5. **本番環境にデプロイ**
   ```bash
   vercel --prod
   ```

### 方法2: GitHub連携（自動デプロイ）

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Setup Vercel deployment"
   git push origin main
   ```

2. **Vercel Dashboardで設定**
   - https://vercel.com/dashboard にアクセス
   - "New Project" をクリック
   - GitHubリポジトリをインポート
   - Build設定は自動検出されます（vercel.jsonを使用）

3. **環境変数を設定**
   - Project Settings → Environment Variables
   - `ANTHROPIC_API_KEY` を追加
   - Environment: Production を選択

4. **デプロイ**
   - "Deploy" をクリック
   - 以降、mainブランチへのプッシュで自動デプロイされます

## 必要な環境変数

Vercel Dashboardで以下の環境変数を設定してください：

| 変数名 | 説明 | 環境 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API Key | Production |
| `NODE_ENV` | `production` | Production |
| `FRONTEND_URL` | フロントエンドのURL（オプション） | Production |

## デプロイ後の確認

1. デプロイが完了すると、VercelからURLが発行されます
2. `https://your-project.vercel.app` にアクセス
3. インタビュー機能が動作することを確認

## トラブルシューティング

### API呼び出しが失敗する場合

- 環境変数が正しく設定されているか確認
- Vercel Dashboardのログを確認

### ビルドエラーが発生する場合

```bash
# ローカルでビルドをテスト
cd frontend
npm install
npm run build
```

### Serverless Functionのタイムアウト

- vercel.json の `maxDuration` を調整（最大60秒、Pro planで300秒）
- 長時間実行される処理は最適化を検討

## ローカル開発

```bash
# フロントエンド（開発サーバー）
npm run dev:frontend

# バックエンド（開発サーバー）
npm run dev:backend

# Vercel環境をローカルでシミュレート
vercel dev
```

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
