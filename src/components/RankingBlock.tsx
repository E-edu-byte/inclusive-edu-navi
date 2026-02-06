'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Article, BASE_PATH } from '@/lib/types';
import { getGlobalStats } from '@/hooks/useArticleStats';

type RankedArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  totalScore: number;
};

// スコア計算の重み
const WEIGHTS = {
  importance: 1.0, // AI重要度スコア
  views: 0.5, // 閲覧数
  bookmarks: 3.0, // しおり数（高配点）
};

export default function RankingBlock() {
  const [rankedArticles, setRankedArticles] = useState<RankedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateRanking() {
      try {
        // 記事データを取得
        const res = await fetch(`${BASE_PATH}/data/articles.json`);
        if (!res.ok) return;

        const data = await res.json();
        const articles: Article[] = data.articles || [];

        // LocalStorageから閲覧数・しおり数を取得
        const { views, bookmarks } = getGlobalStats();

        // スコア計算
        const scored = articles.map((article) => {
          const importanceScore = article.importanceScore || 50; // デフォルト50点
          const viewCount = views[article.id] || 0;
          const bookmarkCount = bookmarks[article.id] || 0;

          const totalScore =
            importanceScore * WEIGHTS.importance +
            viewCount * WEIGHTS.views +
            bookmarkCount * WEIGHTS.bookmarks;

          return {
            id: article.id,
            title: article.title,
            url: article.url,
            source: article.source || '',
            totalScore,
          };
        });

        // スコア順にソートして上位5件
        const top5 = scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

        setRankedArticles(top5);
      } catch (error) {
        console.error('ランキング計算エラー:', error);
      } finally {
        setLoading(false);
      }
    }

    calculateRanking();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-100 rounded w-full"></div>
          <div className="h-3 bg-gray-100 rounded w-full"></div>
          <div className="h-3 bg-gray-100 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (rankedArticles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <svg
          className="w-4 h-4 text-amber-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            clipRule="evenodd"
          />
        </svg>
        人気記事
      </h3>
      <ol className="space-y-2">
        {rankedArticles.map((article, index) => (
          <li key={article.id}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 group"
            >
              <span
                className={`flex-shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                  index === 0
                    ? 'bg-amber-100 text-amber-700'
                    : index === 1
                    ? 'bg-gray-200 text-gray-600'
                    : index === 2
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-700 leading-relaxed group-hover:text-primary-600 transition-colors line-clamp-2">
                  {article.title}
                </span>
                {article.source && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {article.source}
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
