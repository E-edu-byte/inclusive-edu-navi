'use client';

import { useState, useEffect } from 'react';
import { BASE_PATH } from '@/lib/types';

type StatusData = {
  lastUpdated: string | null;
  apiUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
  lastRun: {
    timestamp: string | null;
    articlesProcessed: number;
    articlesAdded: number;
    success: boolean;
    error: string | null;
  };
};

export default function SystemStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BASE_PATH}/data/status.json`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('ステータス取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  if (loading || !status || !status.lastRun?.timestamp) {
    return null;
  }

  // 最終更新日時をフォーマット（日本時間）
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const { apiUsage, lastRun } = status;
  const hasError = !lastRun.success || lastRun.error;

  // API残量のカラー判定
  const getApiBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const remainingPercentage = 100 - apiUsage.percentage;

  return (
    <div className="border-t border-gray-200 mt-6 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400 font-medium">システムステータス</span>
        {hasError && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
            エラー
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-[11px]">
        {/* 最終更新 */}
        <div>
          <span className="text-gray-400 block">最終更新</span>
          <span className="text-gray-600">
            {lastRun.timestamp ? formatDate(lastRun.timestamp) : '-'}
          </span>
        </div>

        {/* API残量 */}
        <div>
          <span className="text-gray-400 block">API残量</span>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[60px]">
              <div
                className={`h-full ${getApiBarColor(apiUsage.percentage)} transition-all`}
                style={{ width: `${remainingPercentage}%` }}
              />
            </div>
            <span className="text-gray-600">{remainingPercentage}%</span>
          </div>
        </div>

        {/* 取得件数 */}
        <div>
          <span className="text-gray-400 block">取得件数</span>
          <span className="text-gray-600">{lastRun.articlesProcessed}件</span>
        </div>
      </div>

      {/* エラーメッセージ */}
      {hasError && lastRun.error && (
        <div className="mt-2 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">
          {lastRun.error.slice(0, 80)}...
        </div>
      )}
    </div>
  );
}
