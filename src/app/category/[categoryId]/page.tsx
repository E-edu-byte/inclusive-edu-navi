'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { categories, getCategoryById, getCategoryByName, BASE_PATH, Article } from '@/lib/types';

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const category = getCategoryById(categoryId);

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
          return articleCategory?.id === categoryId;
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
  }, [categoryId]);

  if (!category) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">カテゴリが見つかりません</h1>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      {/* パンくずリスト */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-primary-600">ホーム</Link>
          </li>
          <li>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="text-gray-900 font-medium">{category.name}</li>
        </ol>
      </nav>

      {/* カテゴリヘッダー */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${category.color} mb-4`}>
            {category.name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {category.name}の記事一覧
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {category.description}
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1">
          {articles.length > 0 ? (
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
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">このカテゴリにはまだ記事がありません。</p>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
