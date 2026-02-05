'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Article, AIPick, ArticlesData, AIPicksData, BASE_PATH } from '@/lib/types';

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editorPicks, setEditorPicks] = useState<AIPick[]>([]);
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

        // 編集部ピックアップデータを取得
        const picksRes = await fetch(`${BASE_PATH}/data/ai-picks.json`);
        if (!picksRes.ok) throw new Error('ピックアップデータの取得に失敗しました');
        const picksData: AIPicksData = await picksRes.json();
        setEditorPicks(picksData.picks || []);
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

  const displayArticles = sortedArticles.slice(0, 10); // 最新10件まで表示

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
          {/* 編集部ピックアップセクション */}
          {editorPicks.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                編集部ピックアップ
              </h2>
              <div className="space-y-6">
                {editorPicks.map((pick) => (
                  <article
                    key={pick.id}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 shadow-sm"
                  >
                    {/* ピックアップ理由 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 rounded-full">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {pick.reason}
                      </span>
                      <span className="text-sm text-gray-500">{pick.category}</span>
                    </div>

                    {/* タイトル */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3 leading-relaxed">
                      {pick.title}
                    </h3>

                    {/* 要約（全文表示） */}
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {pick.summary}
                    </p>

                    {/* メタ情報と外部リンク */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-amber-200">
                      <span className="text-sm text-gray-500">
                        {pick.originalDate}
                      </span>
                      <a
                        href={pick.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        元記事を読む
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* 最新記事セクション */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              最新ニュース
            </h2>

            <div className="space-y-6">
              {displayArticles.map((article) => (
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
                        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                          {article.category}
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

            {/* 記事がない場合 */}
            {articles.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">まだ記事がありません。</p>
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
