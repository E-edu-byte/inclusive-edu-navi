import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import NewsArticleClient from './NewsArticleClient';

// 記事データの型定義
type Article = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  url: string;
  imageUrl?: string;
  source?: string;
  mainKeyword?: string;
};

type ArticlesData = {
  articles: Article[];
};

// ビルド時に記事データを読み込む
function getArticlesData(): Article[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'articles.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data: ArticlesData = JSON.parse(fileContents);
    return data.articles || [];
  } catch (error) {
    console.error('Failed to load articles:', error);
    return [];
  }
}

// 記事IDから記事を取得
function getArticleById(id: string): Article | undefined {
  const articles = getArticlesData();
  return articles.find((article) => article.id === id);
}

// 静的パス生成（ビルド時にすべての記事ページを生成）
export function generateStaticParams() {
  const articles = getArticlesData();
  return articles.map((article) => ({
    id: article.id,
  }));
}

// メタデータ生成（OGP設定）
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const article = getArticleById(params.id);

  if (!article) {
    return {
      title: '記事が見つかりません | インクルーシブ教育ナビ',
    };
  }

  const siteUrl = 'https://news-navi.jp/inclusive';
  const articleUrl = `${siteUrl}/news/${article.id}/`;
  const ogImage = article.imageUrl && article.imageUrl.startsWith('http')
    ? article.imageUrl
    : `${siteUrl}/ogp-image.jpg`;

  return {
    title: `${article.title} | インクルーシブ教育ナビ`,
    description: article.summary,
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      url: articleUrl,
      siteName: 'インクルーシブ教育ナビ',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      publishedTime: article.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: [ogImage],
    },
  };
}

// ページコンポーネント
export default function NewsArticlePage({ params }: { params: { id: string } }) {
  const article = getArticleById(params.id);

  if (!article) {
    notFound();
  }

  return <NewsArticleClient article={article} />;
}
