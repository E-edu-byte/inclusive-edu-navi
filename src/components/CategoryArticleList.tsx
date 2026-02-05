'use client';

import { useState, useEffect } from 'react';
import { Article, BASE_PATH, getCategoryByName, Category } from '@/lib/types';

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
        const res = await fetch(`${BASE_PATH}/data/articles.json`);
        if (!res.ok) throw new Error('記事データの取得に失敗しました');
        const data = await res.json();

        // カテゴリ名でフィルタリング（JSONのcategoryはカテゴリ名）
        const categoryArticles = (data.articles || []).filter((article: Article) => {
          const articleCategory = getCategoryByName(article.category);
          return articleCategory?.id === category.id;
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
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500">このカテゴリにはまだ記事がありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex gap-4">
            {article.imageUrl && (
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${category.color} mb-1`}>
                {category.name}
              </span>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                {article.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {article.summary}
              </p>
              <div className="flex items-center text-xs text-gray-500 mt-2">
                <span>{article.source}</span>
                <span className="mx-2">•</span>
                <span>{article.date}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
