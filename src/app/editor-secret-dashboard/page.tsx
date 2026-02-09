'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BASE_PATH } from '@/lib/types';

// ステータスデータ型
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
    apiCalls: number;
    success: boolean;
    error: string | null;
  };
  history: Array<{
    timestamp: string;
    articlesProcessed: number;
    apiCalls: number;
    success: boolean;
  }>;
};

// トラッキングデータ型
type TrackingData = {
  pageViews: { [page: string]: number };
  clicks: {
    amazon: number;
    rakuten: number;
    buymeacoffee: number;
  };
  shares: {
    x: number;
    line: number;
  };
  errors: Array<{
    timestamp: string;
    path: string;
    type: string;
  }>;
  lastReset: string;
};

// 手動記事データ型
type ManualArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  url: string;
  source: string;
  addedAt: string;
  expiresAt: string;
  isManual: boolean;
};

type ManualArticlesData = {
  articles: ManualArticle[];
  lastUpdated: string | null;
};

// 初期トラッキングデータ
const initialTracking: TrackingData = {
  pageViews: {},
  clicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  shares: { x: 0, line: 0 },
  errors: [],
  lastReset: new Date().toISOString(),
};

export default function EditorDashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [tracking, setTracking] = useState<TrackingData>(initialTracking);
  const [manualArticles, setManualArticles] = useState<ManualArticlesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [postUrl, setPostUrl] = useState('');
  const [postError, setPostError] = useState('');
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    // ステータスデータを取得
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

    // トラッキングデータをlocalStorageから取得
    function loadTracking() {
      try {
        const saved = localStorage.getItem('news-navi-tracking');
        if (saved) {
          setTracking(JSON.parse(saved));
        }
      } catch (error) {
        console.error('トラッキング取得エラー:', error);
      }
    }

    // 手動記事データを取得
    async function fetchManualArticles() {
      try {
        const res = await fetch(`${BASE_PATH}/data/manual-articles.json`);
        if (res.ok) {
          const data = await res.json();
          setManualArticles(data);
        }
      } catch (error) {
        console.error('手動記事取得エラー:', error);
      }
    }

    // 全記事のURLを取得（重複チェック用）
    async function fetchAllUrls() {
      try {
        const urls = new Set<string>();

        // articles.json
        const articlesRes = await fetch(`${BASE_PATH}/data/articles.json`);
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          for (const article of data.articles || []) {
            if (article.url) urls.add(article.url);
          }
        }

        // manual-articles.json
        const manualRes = await fetch(`${BASE_PATH}/data/manual-articles.json`);
        if (manualRes.ok) {
          const data = await manualRes.json();
          for (const article of data.articles || []) {
            if (article.url) urls.add(article.url);
          }
        }

        setExistingUrls(urls);
      } catch (error) {
        console.error('URL取得エラー:', error);
      }
    }

    fetchStatus();
    loadTracking();
    fetchManualArticles();
    fetchAllUrls();
  }, []);

  // 日時フォーマット
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // トラッキングデータをリセット
  const resetTracking = () => {
    const newTracking = { ...initialTracking, lastReset: new Date().toISOString() };
    localStorage.setItem('news-navi-tracking', JSON.stringify(newTracking));
    setTracking(newTracking);
  };

  // API残量のカラー判定
  const getApiBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // URL検証
  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'URLを入力してください';
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '有効なURLを入力してください';
      }
    } catch {
      return '有効なURLを入力してください';
    }
    if (existingUrls.has(url.trim())) {
      return 'この記事は既に存在します';
    }
    return null;
  };

  // GitHub Actions URLを生成
  const getGitHubActionsUrl = (action: string, params: Record<string, string> = {}) => {
    const baseUrl = 'https://github.com/E-edu-byte/inclusive-edu-navi/actions/workflows/manual-post.yml';
    return baseUrl;
  };

  // 投稿ボタンクリック
  const handlePost = () => {
    const error = validateUrl(postUrl);
    if (error) {
      setPostError(error);
      return;
    }
    setPostError('');
    // GitHub Actions ページを開く
    const url = `https://github.com/E-edu-byte/inclusive-edu-navi/actions/workflows/manual-post.yml`;
    window.open(url, '_blank');
  };

  // 期限までの日数を計算
  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">読み込み中...</div>
        </div>
      </div>
    );
  }

  const remainingPercentage = status ? 100 - status.apiUsage.percentage : 0;
  const recentHistory = status?.history?.slice(-10).reverse() || [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
            <p className="text-gray-400 text-sm mt-1">Editor Secret Dashboard</p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← サイトに戻る
          </Link>
        </div>

        {/* システムステータス */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            システムステータス
          </h2>

          {status ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 最終更新 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">最終更新</span>
                <span className="text-white font-medium text-sm">
                  {status.lastRun?.timestamp ? formatDate(status.lastRun.timestamp) : '-'}
                </span>
              </div>

              {/* API残量 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">API残量</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getApiBarColor(status.apiUsage.percentage)} transition-all`}
                      style={{ width: `${remainingPercentage}%` }}
                    />
                  </div>
                  <span className="text-white font-medium text-sm">{remainingPercentage}%</span>
                </div>
                <span className="text-gray-500 text-xs mt-1 block">
                  {status.apiUsage.used}/{status.apiUsage.limit} 使用済み
                </span>
              </div>

              {/* 処理記事数 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">処理記事数</span>
                <span className="text-white font-medium text-lg">
                  {status.lastRun?.articlesProcessed || 0}
                  <span className="text-gray-400 text-sm ml-1">件</span>
                </span>
              </div>

              {/* ステータス */}
              <div className="bg-gray-700 rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">ステータス</span>
                {status.lastRun?.success ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-900 text-green-300">
                    正常
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-900 text-red-300">
                    エラー
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">ステータスデータがありません</p>
          )}
        </section>

        {/* 手動投稿 */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            手動投稿
          </h2>

          {/* URL入力フォーム */}
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <label className="block text-sm text-gray-300 mb-2">記事URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={postUrl}
                onChange={(e) => {
                  setPostUrl(e.target.value);
                  setPostError('');
                }}
                placeholder="https://example.com/article"
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handlePost}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                投稿
              </button>
            </div>
            {postError && (
              <p className="mt-2 text-sm text-red-400">{postError}</p>
            )}
            <p className="mt-3 text-xs text-gray-400">
              投稿ボタンをクリックすると GitHub Actions ページが開きます。<br />
              「Run workflow」→ action: add → URL入力 → 「Run workflow」で実行してください。
            </p>
          </div>

          {/* 手動記事一覧 */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              手動投稿記事一覧
              {manualArticles?.articles && manualArticles.articles.length > 0 && (
                <span className="ml-2 text-amber-500">({manualArticles.articles.length}件)</span>
              )}
            </h3>

            {manualArticles?.articles && manualArticles.articles.length > 0 ? (
              <div className="space-y-3">
                {manualArticles.articles.map((article) => {
                  const daysLeft = getDaysUntilExpiry(article.expiresAt);
                  return (
                    <div key={article.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {article.title}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            {article.source} • {article.date}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {article.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            daysLeft <= 2 ? 'bg-red-900 text-red-300' : 'bg-gray-600 text-gray-300'
                          }`}>
                            残り{daysLeft}日
                          </span>
                          <button
                            onClick={() => {
                              const url = `https://github.com/E-edu-byte/inclusive-edu-navi/actions/workflows/manual-post.yml`;
                              navigator.clipboard.writeText(article.id);
                              alert(`記事ID「${article.id}」をコピーしました。\n\nGitHub Actionsページで:\n1. Run workflow をクリック\n2. action: delete を選択\n3. article_id に貼り付け\n4. Run workflow を実行`);
                              window.open(url, '_blank');
                            }}
                            className="px-3 py-1.5 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">手動投稿された記事はありません</p>
            )}
          </div>

          {/* 使い方ガイド */}
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h4 className="text-sm font-medium text-gray-300 mb-2">使い方</h4>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>上のフォームに記事URLを入力し「投稿」をクリック</li>
              <li>GitHub Actions ページで「Run workflow」をクリック</li>
              <li>action: <code className="bg-gray-600 px-1 rounded">add</code> を選択、URLを入力</li>
              <li>「Run workflow」で実行（AI要約が自動生成されます）</li>
              <li>約2〜3分でサイトに反映されます</li>
            </ol>
            <p className="mt-3 text-xs text-amber-500">
              ※ 手動記事は投稿から7日後に自動的に非表示になります
            </p>
          </div>
        </section>

        {/* 更新履歴 */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">更新履歴（直近10件）</h2>

          {recentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-700">
                    <th className="pb-2 pr-4">日時</th>
                    <th className="pb-2 pr-4">記事数</th>
                    <th className="pb-2 pr-4">API呼出</th>
                    <th className="pb-2">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHistory.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700/50">
                      <td className="py-2 pr-4 text-gray-300">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">
                        {entry.articlesProcessed}件
                      </td>
                      <td className="py-2 pr-4 text-gray-300">
                        {entry.apiCalls}回
                      </td>
                      <td className="py-2">
                        {entry.success ? (
                          <span className="text-green-400">成功</span>
                        ) : (
                          <span className="text-red-400">失敗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">履歴データがありません</p>
          )}
        </section>

        {/* トラッキング */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">トラッキング</h2>
            <button
              onClick={resetTracking}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 border border-gray-600 rounded"
            >
              リセット
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {/* ページビュー合計 */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">総ページビュー</span>
              <span className="text-white font-medium text-lg">
                {Object.values(tracking.pageViews).reduce((a, b) => a + b, 0)}
              </span>
            </div>

            {/* Amazonクリック */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">Amazon</span>
              <span className="text-amber-400 font-medium text-lg">
                {tracking.clicks.amazon}
                <span className="text-gray-400 text-sm ml-1">clicks</span>
              </span>
            </div>

            {/* 楽天クリック */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">楽天</span>
              <span className="text-red-400 font-medium text-lg">
                {tracking.clicks.rakuten}
                <span className="text-gray-400 text-sm ml-1">clicks</span>
              </span>
            </div>

            {/* Buy Me a Coffee */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">Buy Me a Coffee</span>
              <span className="text-yellow-400 font-medium text-lg">
                {tracking.clicks.buymeacoffee}
                <span className="text-gray-400 text-sm ml-1">clicks</span>
              </span>
            </div>

            {/* Xシェア */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">X シェア</span>
              <span className="text-white font-medium text-lg">
                {tracking.shares?.x || 0}
                <span className="text-gray-400 text-sm ml-1">shares</span>
              </span>
            </div>

            {/* LINEシェア */}
            <div className="bg-gray-700 rounded-lg p-4">
              <span className="text-gray-400 text-xs block mb-1">LINE シェア</span>
              <span className="text-[#06C755] font-medium text-lg">
                {tracking.shares?.line || 0}
                <span className="text-gray-400 text-sm ml-1">shares</span>
              </span>
            </div>
          </div>

          {/* ページ別ビュー */}
          {Object.keys(tracking.pageViews).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">ページ別ビュー</h3>
              <div className="bg-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                {Object.entries(tracking.pageViews)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([page, count]) => (
                    <div key={page} className="flex justify-between text-xs py-1 border-b border-gray-600 last:border-0">
                      <span className="text-gray-300 truncate max-w-[200px]">{page}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <p className="text-gray-500 text-xs">
            最終リセット: {formatDate(tracking.lastReset)}
          </p>
        </section>

        {/* エラーログ */}
        <section className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">エラーログ（404等）</h2>

          {tracking.errors.length > 0 ? (
            <div className="bg-gray-700 rounded-lg p-3 max-h-60 overflow-y-auto">
              {tracking.errors.slice(-20).reverse().map((error, index) => (
                <div key={index} className="text-xs py-2 border-b border-gray-600 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-medium">{error.type}</span>
                    <span className="text-gray-500">{formatDate(error.timestamp)}</span>
                  </div>
                  <span className="text-gray-300 block mt-1">{error.path}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">エラーログはありません</p>
          )}
        </section>

        {/* フッター */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>このページは検索エンジンにインデックスされません</p>
          <p className="mt-1">データはlocalStorageに保存されています</p>
        </div>
      </div>
    </div>
  );
}
