# AIインタビュー - 生きがい・人生の意味

AIを活用したインタビューWebアプリケーションです。Claude APIを使用して、ユーザーの「人生において意味や生きがいを感じる活動や経験」についてインタビューを行い、その結果を分析します。

## 特徴

- **スタート画面**: インタビューの目的と安心できる環境を説明
- **インタビュー画面**: LINEのようなチャットUIでAIとの対話
- **結果表示画面**: インタビュー内容を5つのカテゴリで評価・分析

## 技術スタック

### フロントエンド
- React + TypeScript
- Vite
- Tailwind CSS

### バックエンド
- Node.js + Express
- TypeScript
- Anthropic Claude API (claude-sonnet-4-5)

## セットアップ

### 前提条件
- Node.js (v18以上推奨)
- Anthropic APIキー ([取得方法](https://console.anthropic.com/))

### 1. リポジトリのクローンと依存関係のインストール

```bash
cd AIインタビュー

# バックエンドのセットアップ
cd backend
npm install

# フロントエンドのセットアップ
cd ../frontend
npm install
```

### 2. 環境変数の設定

バックエンドディレクトリに `.env` ファイルを作成します：

```bash
cd backend
cp .env.example .env
```

`.env` ファイルを編集して、Anthropic APIキーを設定：

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. アプリケーションの起動

#### バックエンドの起動

```bash
cd backend
npm run dev
```

サーバーが `http://localhost:3001` で起動します。

#### フロントエンドの起動

別のターミナルウィンドウで：

```bash
cd frontend
npm run dev
```

フロントエンドが `http://localhost:5173` で起動します。

### 4. ブラウザでアクセス

ブラウザで `http://localhost:5173` を開いてアプリケーションを使用します。

## 使い方

1. **スタート画面**: 「インタビューを開始する」ボタンをクリック
2. **インタビュー画面**:
   - AIからの質問に対して、テキストボックスに回答を入力
   - 「送信」ボタンまたはEnterキーで送信
   - インタビューを途中で終了したい場合は「中断する」ボタンをクリック
3. **結果表示画面**:
   - 5つのカテゴリ（A〜E）の評価結果を確認
   - カテゴリ名をクリックして詳細を展開
   - 根拠をクリックすると、インタビュー記録の該当箇所がハイライト表示されます

## プロジェクト構造

```
AIインタビュー/
├── backend/                 # バックエンド
│   ├── src/
│   │   ├── index.ts        # Expressサーバー
│   │   ├── types.ts        # 型定義
│   │   ├── routes/
│   │   │   └── interview.ts # APIエンドポイント
│   │   └── services/
│   │       ├── claudeService.ts    # Claude API統合
│   │       └── analysisService.ts  # 回答分析
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # フロントエンド
│   ├── src/
│   │   ├── App.tsx         # メインアプリ
│   │   ├── pages/
│   │   │   ├── StartScreen.tsx      # スタート画面
│   │   │   ├── InterviewScreen.tsx  # インタビュー画面
│   │   │   └── ResultScreen.tsx     # 結果表示画面
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx      # チャットメッセージ
│   │   │   └── CategoryTable.tsx    # カテゴリテーブル
│   │   ├── services/
│   │   │   └── api.ts              # API呼び出し
│   │   └── types/
│   │       └── index.ts            # 型定義
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## API エンドポイント

### POST /api/interview/start
インタビューセッションを開始

### POST /api/interview/message
インタビュー中にメッセージを送信
- Body: `{ sessionId: string, message: string }`

### POST /api/interview/end
インタビューを手動で終了
- Body: `{ sessionId: string }`

### POST /api/interview/analyze
インタビュー結果を分析
- Body: `{ sessionId: string }`

### GET /api/interview/transcript/:sessionId
インタビューの記録を取得

## 分析カテゴリ

アプリケーションは以下の5つのカテゴリでインタビュー結果を分析します：

- **A: 仕事への意味・充実感** (10項目)
- **B: 人間関係・つながりの感覚** (10項目)
- **C: 自己成長・学びへの志向** (10項目)
- **D: 人生全体の意味・目的感** (10項目)
- **E: 日常の喜び・主観的幸福感** (10項目)

各項目について、ポジティブ(1)、ネガティブ(-1)、言及なし(0)で評価されます。

## 論文参考

このアプリケーションは以下の論文の手法を参考にしています：
- "Conversations at Scale: Robust AI-led Interviews" (Geiecke & Jaravel, 2026)

## ライセンス

ISC

## 注意事項

- このアプリケーションはClaude APIを使用するため、API利用料金が発生します
- APIキーは安全に管理してください（.envファイルはGitにコミットしないでください）
- 本番環境で使用する場合は、セッション管理をRedisやデータベースで行うことを推奨します
