'use client';

import { useState, useEffect } from 'react';
import { Article, BASE_PATH, getCategoryByName, Category, isPublishableSummary, fetchTrashedUrls } from '@/lib/types';
import NewsCard from '@/components/NewsCard';
import BookmarkShortcut from '@/components/BookmarkShortcut';

type Props = {
  category: Category;
};

export default function CategoryArticleList({ category }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 記事データとゴミ箱データを並列取得
        const [res, trashedUrls] = await Promise.all([
          fetch(`${BASE_PATH}/data/articles.json`),
          fetchTrashedUrls()
        ]);
        if (!res.ok) throw new Error('記事データの取得に失敗しました');
        const data = await res.json();

        // カテゴリ名でフィルタリング + 公開可能な記事のみ + ゴミ箱除外
        const categoryArticles = (data.articles || []).filter((article: Article) => {
          const articleCategory = getCategoryByName(article.category);
          // カテゴリが一致 かつ AI要約が完了 かつ ゴミ箱に入っていない
          return articleCategory?.id === category.id &&
                 isPublishableSummary(article.summary) &&
                 !trashedUrls.has(article.url);
        });

        // 日付でソート（新しい順）
        categoryArticles.sort((a: Article, b: Article) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setArticles(categoryArticles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [category.id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <>
        {/* スマホ用：保存した記事へのショートカット */}
        <BookmarkShortcut />
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">このカテゴリにはまだ記事がありません。</p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* スマホ用：保存した記事へのショートカット */}
      <BookmarkShortcut />
      {articles.map((article) => (
        <NewsCard
          key={article.id}
          title={article.title}
          summary={article.summary}
          imageUrl={article.imageUrl}
          category={category.name}
          source={article.source}
          date={article.date}
          url={article.url}
          id={article.id}
          mainKeyword={article.mainKeyword}
          isPickup={false}
        />
      ))}
    </div>
  );
}
