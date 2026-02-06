'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import NewsCard from '@/components/NewsCard';
import { Article, AIPick, ArticlesData, AIPicksData, BASE_PATH } from '@/lib/types';

// 編集部ピックアップ用の統一型（AI選出 or 自動選出）
type PickItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  url: string;
  imageUrl?: string;
  source?: string;
  mainKeyword?: string;
  isAIPick: boolean;
  pickupReason?: string;
};

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pickItems, setPickItems] = useState<PickItem[]>([]);
  const [latestNews, setLatestNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 記事データを取得
        const articlesRes = await fetch(`${BASE_PATH}/data/articles.json`);
        if (!articlesRes.ok) throw new Error('記事データの取得に失敗しました');
        const articlesData: ArticlesData = await articlesRes.json();
        const articlesArray = articlesData.articles || [];
        setArticles(articlesArray);

        // 日付でソート（新しい順）
        const sortedAll = [...articlesArray].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // 編集部ピックアップデータを取得
        let aiPicks: AIPick[] = [];
        try {
          const picksRes = await fetch(`${BASE_PATH}/data/ai-picks.json`);
          if (picksRes.ok) {
            const picksData: AIPicksData = await picksRes.json();
            aiPicks = picksData.picks || [];
          }
        } catch {
          // ai-picks.json がない場合は空配列
        }

        // 有効なAIピックアップを抽出（sourceArticleIdが存在する記事のみ）
        const validAIPicks = aiPicks.filter((pick) =>
          articlesArray.some((a) => a.id === pick.sourceArticleId)
        );

        // ピックアップ用の記事を準備（最大5件）
        const picks: PickItem[] = [];
        const usedIds = new Set<string>();

        // 1. まずAIピックアップから追加（最大5件）
        for (const pick of validAIPicks.slice(0, 5)) {
          const sourceArticle = articlesArray.find((a) => a.id === pick.sourceArticleId);
          if (sourceArticle && !usedIds.has(sourceArticle.id)) {
            picks.push({
              id: pick.id,
              title: pick.title,
              summary: pick.summary,
              category: pick.category,
              date: pick.originalDate,
              url: pick.url,
              imageUrl: sourceArticle.imageUrl,
              source: sourceArticle.source,
              mainKeyword: sourceArticle.mainKeyword,
              isAIPick: true,
              pickupReason: pick.reason,
            });
            usedIds.add(sourceArticle.id);
          }
        }

        // 2. AIピックアップが5件未満の場合、最新記事から補完
        if (picks.length < 5) {
          for (const article of sortedAll) {
            if (picks.length >= 5) break;
            if (!usedIds.has(article.id)) {
              picks.push({
                id: `auto-${article.id}`,
                title: article.title,
                summary: article.summary,
                category: article.category,
                date: article.date,
                url: article.url,
                imageUrl: article.imageUrl,
                source: article.source,
                mainKeyword: article.mainKeyword,
                isAIPick: false,
              });
              usedIds.add(article.id);
            }
          }
        }

        setPickItems(picks);

        // 3. 最新ニュース: ピックアップに含まれない記事から5件
        const remaining = sortedAll.filter((a) => !usedIds.has(a.id));
        setLatestNews(remaining.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
      <section className="mb-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-xl shadow-sm border border-sky-100/50 p-6 sm:p-10">
          {/* 装飾: 柔らかい幾何学模様 */}
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full text-sky-300">
              <circle cx="80" cy="20" r="8" fill="currentColor" opacity="0.6" />
              <circle cx="60" cy="40" r="5" fill="currentColor" opacity="0.4" />
              <circle cx="90" cy="50" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="70" cy="70" r="4" fill="currentColor" opacity="0.3" />
              <circle cx="50" cy="25" r="3" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-36 sm:h-36 opacity-15">
            <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-300">
              <circle cx="20" cy="80" r="7" fill="currentColor" opacity="0.5" />
              <circle cx="40" cy="60" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="10" cy="50" r="5" fill="currentColor" opacity="0.3" />
              <circle cx="35" cy="85" r="3" fill="currentColor" opacity="0.4" />
            </svg>
          </div>

          {/* コンテンツ */}
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
              すべての子どもの学びを支える
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
              特別支援教育に関する最新のニュース、研究成果、実践事例を
              わかりやすくお届けします。教育現場で役立つ情報を厳選してご紹介。
            </p>
          </div>

          {/* アクセントライン */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-200 via-indigo-200 to-purple-200 opacity-60"></div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1 min-w-0">
          {/* 編集部ピックアップセクション（常に5件表示） */}
          {pickItems.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                編集部ピックアップ
              </h2>
              <div className="space-y-3">
                {pickItems.map((pick) => (
                  <NewsCard
                    key={pick.id}
                    title={pick.title}
                    summary={pick.summary}
                    imageUrl={pick.imageUrl}
                    category={pick.category}
                    source={pick.source}
                    date={pick.date}
                    url={pick.url}
                    mainKeyword={pick.mainKeyword}
                    isPickup={pick.isAIPick}
                    pickupReason={pick.pickupReason}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 最新ニュースセクション（常に5件表示） */}
          {latestNews.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                最新ニュース
              </h2>

              <div className="space-y-3">
                {latestNews.map((article) => (
                  <NewsCard
                    key={article.id}
                    title={article.title}
                    summary={article.summary}
                    imageUrl={article.imageUrl}
                    category={article.category}
                    source={article.source}
                    date={article.date}
                    url={article.url}
                    mainKeyword={article.mainKeyword}
                    isPickup={false}
                  />
                ))}
              </div>

              {/* すべてのニュースを見るボタン */}
              {articles.length > 10 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/news"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    すべてのニュースを見る
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* 記事がない場合 */}
          {articles.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">まだ記事がありません。</p>
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
