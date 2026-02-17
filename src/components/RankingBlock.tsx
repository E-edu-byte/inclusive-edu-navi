'use client';

import { useState, useEffect } from 'react';
import { Article, BASE_PATH, isPublishableSummary } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type RankedArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  clickCount: number;
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
        // 【公開フィルタ】AI要約が完了した記事のみをランキング対象にする
        const articles: Article[] = (data.articles || []).filter(
          (article: Article) => isPublishableSummary(article.summary)
        );

        // Supabaseから直近7日間のクリック数を取得
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: clickData, error } = await supabase
          .from('article_clicks')
          .select('article_id')
          .gte('clicked_at', sevenDaysAgo.toISOString());

        if (error) {
          console.error('クリック数取得エラー:', error);
          return;
        }

        // クリック数を集計
        const clickCounts: Record<string, number> = {};
        (clickData || []).forEach((row: { article_id: string }) => {
          clickCounts[row.article_id] = (clickCounts[row.article_id] || 0) + 1;
        });

        // 記事データとクリック数をマージ
        const scored = articles.map((article) => ({
          id: article.id,
          title: article.title,
          url: article.url,
          source: article.source || '',
          clickCount: clickCounts[article.id] || 0,
        }));

        // クリック数順にソートして上位5件
        const top5 = scored
          .filter((a) => a.clickCount > 0)
          .sort((a, b) => b.clickCount - a.clickCount)
          .slice(0, 5);

        // クリックデータがない場合は最新記事を表示
        if (top5.length === 0) {
          const latest5 = articles.slice(0, 5).map((article) => ({
            id: article.id,
            title: article.title,
            url: article.url,
            source: article.source || '',
            clickCount: 0,
          }));
          setRankedArticles(latest5);
        } else {
          setRankedArticles(top5);
        }
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
