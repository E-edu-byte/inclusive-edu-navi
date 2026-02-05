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
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500">このカテゴリにはまだ記事がありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {articles.map((article) => (
        <article
          key={article.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col sm:flex-row">
            {/* サムネイル画像 */}
            {article.imageUrl && (
              <div className="sm:w-48 sm:flex-shrink-0">
                <div className="aspect-video sm:aspect-square h-full bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* コンテンツ */}
            <div className="flex-1 p-5">
              {/* カテゴリとメタ情報 */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${category.color}`}>
                  {category.name}
                </span>
                <span className="text-xs text-gray-500">
                  {article.source} • {article.date}
                </span>
              </div>

              {/* タイトル */}
              <h3 className="text-lg font-bold text-gray-900 mb-3 leading-relaxed">
                {article.title}
              </h3>

              {/* 要約（全文表示） */}
              <p className="text-gray-600 leading-relaxed mb-4">
                {article.summary}
              </p>

              {/* 続きを読むボタン */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                続きを読む
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
