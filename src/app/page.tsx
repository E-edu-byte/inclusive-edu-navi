'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Article, AIPick, ArticlesData, AIPicksData, BASE_PATH } from '@/lib/types';

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [aiPicks, setAiPicks] = useState<AIPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 記事データを取得
        const articlesRes = await fetch(`${BASE_PATH}/data/articles.json`);
        if (!articlesRes.ok) throw new Error('記事データの取得に失敗しました');
        const articlesData: ArticlesData = await articlesRes.json();
        setArticles(articlesData.articles || []);

        // AIおすすめデータを取得
        const aiPicksRes = await fetch(`${BASE_PATH}/data/ai-picks.json`);
        if (!aiPicksRes.ok) throw new Error('AIおすすめデータの取得に失敗しました');
        const aiPicksData: AIPicksData = await aiPicksRes.json();
        setAiPicks(aiPicksData.picks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 日付でソート（新しい順）
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const featuredArticle = sortedArticles[0];
  const otherArticles = sortedArticles.slice(1, 10); // 最新10件まで表示

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
      {/* ヒーローセクション */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 sm:p-12 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            すべての子どもの学びを支える
          </h1>
          <p className="text-primary-100 text-base sm:text-lg leading-relaxed max-w-2xl">
            特別支援教育に関する最新のニュース、研究成果、実践事例を
            わかりやすくお届けします。教育現場で役立つ情報を厳選してご紹介。
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1">
          {/* AIのおすすめセクション */}
          {aiPicks.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AIのおすすめ
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {aiPicks.map((pick) => (
                  <a
                    key={pick.id}
                    href={pick.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded mb-2">
                      {pick.reason}
                    </span>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                      {pick.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {pick.summary}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {pick.originalDate}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 最新記事 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              最新記事
            </h2>

            {/* 注目記事（大きく表示） */}
            {featuredArticle && (
              <div className="mb-6">
                <a
                  href={featuredArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {featuredArticle.imageUrl && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={featuredArticle.imageUrl}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded mb-2">
                      {featuredArticle.category}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {featuredArticle.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {featuredArticle.summary}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span>{featuredArticle.source}</span>
                      <span className="mx-2">•</span>
                      <span>{featuredArticle.date}</span>
                    </div>
                  </div>
                </a>
              </div>
            )}

            {/* その他の記事 */}
            <div className="space-y-4">
              {otherArticles.map((article) => (
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
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded mb-1">
                        {article.category}
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

            {/* 記事がない場合 */}
            {articles.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>まだ記事がありません。</p>
              </div>
            )}
          </section>
        </div>

        {/* サイドバー */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
