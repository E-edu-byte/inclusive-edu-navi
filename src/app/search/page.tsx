'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import { getCategoryByName, BASE_PATH, isPublishableSummary } from '@/lib/types';

type Article = {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
  category: string;
  source?: string;
  date: string;
  url: string;
  mainKeyword?: string;
};

// 検索用にテキストを正規化（全角→半角、大文字→小文字）
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // 全角英数字を半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    // 全角スペースを半角に
    .replace(/　/g, ' ')
    // 長音記号の統一
    .replace(/[ー－―]/g, '-')
    .trim();
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // ニュースデータを取得（BASE_PATHを使用）
    fetch(`${BASE_PATH}/data/articles.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        // 【公開フィルタ】AI要約が完了した記事のみを検索対象にする
        const publishableArticles = (data.articles || []).filter(
          (article: Article) => isPublishableSummary(article.summary)
        );
        setArticles(publishableArticles);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('記事データ取得エラー:', err);
        setFetchError(err.message);
        setArticles([]);
        setIsLoading(false);
      });
  }, []);

  // 検索クエリで記事をフィルタリング（あいまい検索対応）
  const searchResults = query
    ? articles.filter((article) => {
        const normalizedQuery = normalizeText(query);
        const normalizedTitle = normalizeText(article.title);
        const normalizedSummary = normalizeText(article.summary);
        const normalizedCategory = normalizeText(article.category);
        const normalizedSource = normalizeText(article.source || '');
        const normalizedKeyword = normalizeText(article.mainKeyword || '');

        // 部分一致検索（タイトル、要約、カテゴリ、ソース、キーワード）
        return (
          normalizedTitle.includes(normalizedQuery) ||
          normalizedSummary.includes(normalizedQuery) ||
          normalizedCategory.includes(normalizedQuery) ||
          normalizedSource.includes(normalizedQuery) ||
          normalizedKeyword.includes(normalizedQuery)
        );
      })
    : [];

  if (isLoading) {
    return (
      <div className="container-main py-8 sm:py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-40"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 sm:py-12">
      {/* 検索ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          検索結果
        </h1>
        {query && (
          <p className="text-gray-600">
            「<span className="font-medium text-primary-600">{query}</span>」の検索結果: {searchResults.length}件
          </p>
        )}
      </div>

      {/* 検索結果 */}
      {!query ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">検索キーワードを入力してください</p>
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            トップページへ戻る
          </Link>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            該当する記事が見つかりませんでした
          </h2>
          <p className="text-gray-600 mb-6">
            別のキーワードで検索するか、カテゴリから探してみてください。
          </p>
          {fetchError && (
            <p className="text-xs text-red-400 mb-4">
              データ取得エラー: {fetchError}
            </p>
          )}
          {articles.length === 0 && !fetchError && (
            <p className="text-xs text-gray-400 mb-4">
              検索対象の記事数: 0件（データ読み込み中の可能性があります）
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
            >
              トップページへ戻る
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg font-medium transition-colors"
            >
              ニュース一覧を見る
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResults.map((article) => {
            const cat = getCategoryByName(article.category);
            return (
              <NewsCard
                key={article.id}
                title={article.title}
                summary={article.summary}
                imageUrl={article.imageUrl}
                category={cat?.name || article.category}
                source={article.source}
                date={article.date}
                url={article.url}
                mainKeyword={article.mainKeyword}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container-main py-8 sm:py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-40"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
