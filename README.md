# インクルーシブ教育ナビ

インクルーシブ教育に関する最新ニュース・情報をお届けする静的サイトです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **ホスティング**: GitHub Pages
- **言語**: TypeScript

## 機能

- 📰 記事一覧・詳細表示
- 📁 カテゴリ別記事表示
- 📱 レスポンシブデザイン（スマホファースト）
- 🔍 SEO最適化（メタタグ、OGP、サイトマップ）
- 📡 RSSフィード

## カテゴリ

1. 制度・法改正
2. 研究・学術
3. 実践・事例
4. 教材・ツール
5. イベント・研修
6. 注目トピックス

## 開発

### 必要条件

- Node.js 18以上
- npm

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアクセスできます。

### ビルド

```bash
# 静的サイト生成
npm run build
```

`out` ディレクトリに静的ファイルが生成されます。

## デプロイ

GitHub Pagesへのデプロイは、`main`ブランチへのプッシュ時に自動的に行われます。

### 初回セットアップ

1. GitHubリポジトリの Settings > Pages を開く
2. Source を「GitHub Actions」に設定
3. `main`ブランチにプッシュ

### カスタムドメインを使用する場合

1. `next.config.mjs` の `basePath` と `assetPrefix` をコメントアウト
2. `public/CNAME` ファイルにドメインを記載

## 自動ニュース収集システム

特別支援教育関連のニュースをRSSフィードから自動収集するシステムです。

### 収集対象

- リセマム（教育ニュース）
- Impress Watch（IT・テクノロジー）
- NHK NEWS WEB（社会ニュース）

### 必要条件

- Python 3.8以上
- pip

### セットアップ

```bash
# Python依存パッケージのインストール
pip install -r scripts/requirements.txt
```

### ニュース収集の実行

```bash
# 手動実行
python scripts/fetch-news.py
```

収集された記事は `public/data/articles.json` に保存されます。

### 自動実行（GitHub Actions）

`main`ブランチへのプッシュ時、または毎日定時に自動実行されます。

### 収集データの形式

```json
{
  "articles": [
    {
      "id": "記事ID",
      "title": "タイトル",
      "summary": "要約（200字程度）",
      "category": "カテゴリ名",
      "date": "2024-03-15",
      "url": "元記事URL",
      "imageUrl": "画像URL",
      "source": "情報源名"
    }
  ],
  "lastUpdated": "2024-03-15T12:00:00",
  "totalCount": 100,
  "sources": ["リセマム", "Impress Watch", "NHK NEWS WEB"]
}
```

## 記事の手動追加方法

`src/data/articles.ts` に記事データを追加してください。

```typescript
{
  id: '4',
  title: '記事タイトル',
  slug: 'article-slug',
  excerpt: '記事の概要...',
  content: `
    ## 見出し
    本文...
  `,
  categoryId: 'policy', // カテゴリID
  publishedAt: '2024-04-01',
  image: '/images/article-4.jpg',
  sources: [
    { title: '参考リンク', url: 'https://example.com' }
  ],
}
```

## Google Analytics

`src/app/layout.tsx` のコメントアウトされた部分に、Google AnalyticsのトラッキングIDを設定してください。

## ライセンス

All rights reserved.
