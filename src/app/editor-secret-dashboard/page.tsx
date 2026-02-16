'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BASE_PATH } from '@/lib/types';

// パスワードハッシュ（ビルド時に環境変数から設定）
const PASSWORD_HASH = process.env.NEXT_PUBLIC_EDITOR_PASSWORD_HASH || '';

// SHA-256ハッシュ関数（Web Crypto API使用）
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    isManual?: boolean;
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
  // 累計アクセス数（リセットしても保持）
  totalPageViews?: number;
  // 日別アクセス記録
  dailyPageViews?: { [date: string]: number };
  // 累計クリック数
  totalClicks?: {
    amazon: number;
    rakuten: number;
    buymeacoffee: number;
  };
  // 日別クリック記録
  dailyClicks?: { [date: string]: { amazon: number; rakuten: number; buymeacoffee: number } };
  // 累計シェア数
  totalShares?: {
    x: number;
    line: number;
  };
  // 日別シェア記録
  dailyShares?: { [date: string]: { x: number; line: number } };
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

// 全記事データ型（削除用）
type ArticleForDeletion = {
  title: string;
  url: string;
  source: string;
  date: string;
  isManual?: boolean;
};

// GA4アナリティクスデータ型
type AnalyticsData = {
  lastUpdated: string | null;
  period: string;
  pageViews: number;
  todayPageViews?: number;
  users: number;
  todayUsers?: number;
  sessions: number;
  todaySessions?: number;
  clicks: {
    amazon: number;
    rakuten: number;
    ofuse: number;
  };
  todayClicks?: {
    amazon: number;
    rakuten: number;
    ofuse: number;
  };
  shares: {
    x: number;
    line: number;
  };
  todayShares?: {
    x: number;
    line: number;
  };
  topPages: Array<{
    path: string;
    views: number;
  }>;
};

// 初期トラッキングデータ
const initialTracking: TrackingData = {
  pageViews: {},
  clicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  shares: { x: 0, line: 0 },
  errors: [],
  lastReset: new Date().toISOString(),
  totalPageViews: 0,
  dailyPageViews: {},
  totalClicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  dailyClicks: {},
  totalShares: { x: 0, line: 0 },
  dailyShares: {},
};

export default function EditorDashboard() {
  // 認証状態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [status, setStatus] = useState<StatusData | null>(null);
  const [tracking, setTracking] = useState<TrackingData>(initialTracking);
  const [manualArticles, setManualArticles] = useState<ManualArticlesData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [postUrl, setPostUrl] = useState('');
  const [postError, setPostError] = useState('');
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set());
  const [allArticles, setAllArticles] = useState<ArticleForDeletion[]>([]);
  const [selectedArticleUrls, setSelectedArticleUrls] = useState<Set<string>>(new Set());
  const [editorMessage, setEditorMessage] = useState('');
  const [editorMessageSaved, setEditorMessageSaved] = useState(false);

  // 認証チェック（localStorage）
  useEffect(() => {
    const checkAuth = async () => {
      const savedHash = localStorage.getItem('editor-auth-hash');
      if (savedHash && savedHash === PASSWORD_HASH) {
        setIsAuthenticated(true);
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  // パスワード認証
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!password) {
      setAuthError('パスワードを入力してください');
      return;
    }

    const inputHash = await sha256(password);
    if (inputHash === PASSWORD_HASH) {
      localStorage.setItem('editor-auth-hash', inputHash);
      setIsAuthenticated(true);
    } else {
      setAuthError('パスワードが正しくありません');
      setPassword('');
    }
  };

  // ログアウト
  const handleLogout = () => {
    localStorage.removeItem('editor-auth-hash');
    setIsAuthenticated(false);
    setPassword('');
  };

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
          const data = JSON.parse(saved);
          // 累計アクセス数がない場合は現在のページビュー合計を設定
          if (!data.totalPageViews) {
            data.totalPageViews = Object.values(data.pageViews as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
          }
          // 日別アクセス記録がない場合は初期化
          if (!data.dailyPageViews) {
            data.dailyPageViews = {};
          }
          setTracking(data);
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

    // GA4アナリティクスデータを取得
    async function fetchAnalytics() {
      try {
        const res = await fetch(`${BASE_PATH}/data/analytics.json`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('手動記事取得エラー:', error);
      }
    }

    // 全記事のURLを取得（重複チェック用）+ 記事一覧（削除用）
    async function fetchAllUrls() {
      try {
        const urls = new Set<string>();
        const articleMap = new Map<string, ArticleForDeletion>(); // URLをキーに管理（重複排除）

        // 除外URL一覧を取得
        const excludedUrls = new Set<string>();
        try {
          const excludedRes = await fetch(`${BASE_PATH}/data/excluded-urls.json`);
          if (excludedRes.ok) {
            const excludedData = await excludedRes.json();
            for (const url of excludedData.excludedUrls || []) {
              excludedUrls.add(url);
            }
          }
        } catch {
          // 除外URLの取得に失敗しても続行
        }

        // manual-articles.json を先に読み込み（手動記事を優先）
        const manualRes = await fetch(`${BASE_PATH}/data/manual-articles.json`);
        if (manualRes.ok) {
          const data = await manualRes.json();
          for (const article of data.articles || []) {
            if (article.url && !excludedUrls.has(article.url)) {
              urls.add(article.url);
              articleMap.set(article.url, {
                title: article.title,
                url: article.url,
                source: article.source || '',
                date: article.date || '',
                isManual: true,
              });
            }
          }
        }

        // articles.json（手動記事と重複するURLはスキップ）
        const articlesRes = await fetch(`${BASE_PATH}/data/articles.json`);
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          for (const article of data.articles || []) {
            if (article.url && !excludedUrls.has(article.url) && !articleMap.has(article.url)) {
              urls.add(article.url);
              articleMap.set(article.url, {
                title: article.title,
                url: article.url,
                source: article.source || '',
                date: article.date || '',
                isManual: false,
              });
            }
          }
        }

        setExistingUrls(urls);
        // Mapから配列に変換し、日付の新しい順にソート
        const articles = Array.from(articleMap.values());
        articles.sort((a, b) => b.date.localeCompare(a.date));
        setAllArticles(articles);
      } catch (error) {
        console.error('URL取得エラー:', error);
      }
    }

    // 編集長メッセージを取得
    async function fetchEditorMessage() {
      try {
        const res = await fetch(`${BASE_PATH}/data/editor-message.json`);
        if (res.ok) {
          const data = await res.json();
          setEditorMessage(data.message || '');
        }
      } catch (error) {
        console.error('編集長メッセージ取得エラー:', error);
      }
    }

    fetchStatus();
    loadTracking();
    fetchManualArticles();
    fetchAllUrls();
    fetchAnalytics();
    fetchEditorMessage();
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

  // トラッキングデータをリセット（累計は保持）
  const resetTracking = () => {
    const newTracking = {
      ...initialTracking,
      lastReset: new Date().toISOString(),
      // 累計は全て保持
      totalPageViews: tracking.totalPageViews || 0,
      dailyPageViews: tracking.dailyPageViews || {},
      totalClicks: tracking.totalClicks || { amazon: 0, rakuten: 0, buymeacoffee: 0 },
      dailyClicks: tracking.dailyClicks || {},
      totalShares: tracking.totalShares || { x: 0, line: 0 },
      dailyShares: tracking.dailyShares || {},
    };
    localStorage.setItem('news-navi-tracking', JSON.stringify(newTracking));
    setTracking(newTracking);
  };

  // 削除確認モーダルの状態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUrlText, setDeleteUrlText] = useState('');

  // 記事を削除（ブラックリストに追加）- 複数URL対応
  const deleteArticles = (urls: string[]) => {
    if (urls.length === 0) {
      alert('削除する記事を選択してください');
      return;
    }

    // スペース区切りでURLを結合（GitHub Actionsの単一行入力に対応）
    const urlText = urls.join(' ');
    setDeleteUrlText(urlText);
    setShowDeleteModal(true);
  };

  // 削除実行
  const executeDelete = () => {
    navigator.clipboard.writeText(deleteUrlText);
    window.open('https://github.com/E-edu-byte/inclusive-edu-navi/actions/workflows/exclude-article.yml', '_blank');
    setShowDeleteModal(false);
    setSelectedArticleUrls(new Set());
  };

  // チェックボックスの切り替え
  const toggleArticleSelection = (url: string) => {
    setSelectedArticleUrls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedArticleUrls.size === allArticles.length) {
      setSelectedArticleUrls(new Set());
    } else {
      setSelectedArticleUrls(new Set(allArticles.map(a => a.url)));
    }
  };

  // 今日の日付を取得（YYYY-MM-DD形式、ゼロパディング付き）
  const getTodayDate = () => {
    const now = new Date();
    // JSTに変換
    const jstOffset = 9 * 60; // 9時間（分）
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jst = new Date(utc + (jstOffset * 60000));
    const year = jst.getFullYear();
    const month = String(jst.getMonth() + 1).padStart(2, '0');
    const day = String(jst.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 今日のアクセス数を取得
  const getTodayPageViews = () => {
    const today = getTodayDate();
    return tracking.dailyPageViews?.[today] || 0;
  };

  // 今日のクリック数を取得
  const getTodayClicks = (type: 'amazon' | 'rakuten' | 'buymeacoffee') => {
    const today = getTodayDate();
    return tracking.dailyClicks?.[today]?.[type] || 0;
  };

  // 今日のシェア数を取得
  const getTodayShares = (type: 'x' | 'line') => {
    const today = getTodayDate();
    return tracking.dailyShares?.[today]?.[type] || 0;
  };

  // API残量のカラー判定
  const getApiBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 手動投稿のタイムスタンプ一覧を取得
  const manualTimestamps = new Set<string>(
    (manualArticles?.articles || []).map(a => {
      // addedAtの秒以下を切り捨てて比較用に正規化（例: "2026-02-15T16:15" の形式）
      return a.addedAt?.slice(0, 16) || '';
    }).filter(Boolean)
  );

  // 履歴エントリが手動投稿かどうかを判定
  const isManualEntry = (entry: { timestamp: string; isManual?: boolean }): boolean => {
    // isManualフィールドがある場合はそれを使用
    if (typeof entry.isManual === 'boolean') {
      return entry.isManual;
    }
    // isManualフィールドがない場合は、manual-articles.jsonのaddedAtと照合
    const entryTimePrefix = entry.timestamp?.slice(0, 16) || '';
    return manualTimestamps.has(entryTimePrefix);
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

  // 認証チェック中
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="animate-pulse">認証確認中...</div>
      </div>
    );
  }

  // 未認証の場合はログイン画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">管理者ログイン</h1>
              <p className="text-gray-400 text-sm">パスワードを入力してください</p>
            </div>

            <form onSubmit={handleAuth}>
              <div className="mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {authError && (
                  <p className="mt-2 text-sm text-red-400">{authError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                ログイン
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← サイトに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">読み込み中...</div>
        </div>
      </div>
    );
  }

  // クォータ期間内の使用量を取得（サーバー側で計算済みの値を使用）
  const getQuotaUsage = (): { used: number; limit: number; remaining: number } => {
    const DAILY_LIMIT = 20;
    // status.apiUsage はサーバー側（fetch-news.py）で正しく計算されている
    // タイムゾーンの不整合を避けるため、この値を直接使用する
    if (!status?.apiUsage) {
      return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT };
    }

    const used = status.apiUsage.used || 0;
    return {
      used,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - used),
    };
  };

  const quotaUsage = getQuotaUsage();
  const remainingPercentage = Math.round((quotaUsage.remaining / quotaUsage.limit) * 100);
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
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              ログアウト
            </button>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← サイトに戻る
            </Link>
          </div>
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

              {/* API残量（17:00 JSTリセット対応） */}
              <div className="bg-gray-700 rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">API残量（17:00リセット）</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getApiBarColor(100 - remainingPercentage)} transition-all`}
                      style={{ width: `${remainingPercentage}%` }}
                    />
                  </div>
                  <span className="text-white font-medium text-sm">{quotaUsage.remaining}/{quotaUsage.limit}</span>
                </div>
                <span className="text-gray-500 text-xs mt-1 block">
                  今期間: {quotaUsage.used}回使用済み
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
              ※ 手動記事は投稿から7日後に自動的に非表示になります（毎日7:00/17:10/18:00 JSTに自動クリーンアップ）
            </p>
          </div>
        </section>

        {/* 編集長のひとりごと */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">&#128221;</span>
            編集長のひとりごと
          </h2>

          <div className="bg-gray-700 rounded-lg p-4">
            <label className="block text-sm text-gray-300 mb-2">メッセージ内容</label>
            <textarea
              value={editorMessage}
              onChange={(e) => {
                setEditorMessage(e.target.value);
                setEditorMessageSaved(false);
              }}
              placeholder="トップページに表示するひとことを入力..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                トップページの「すべての子どもの学びを支える」の横に表示されます
              </p>
              <div className="flex items-center gap-2">
                {editorMessageSaved && (
                  <span className="text-xs text-green-400">URLをコピーしました</span>
                )}
                <button
                  onClick={() => {
                    // GitHub Actions update-editor-message ワークフローを開く
                    navigator.clipboard.writeText(editorMessage);
                    setEditorMessageSaved(true);
                    window.open('https://github.com/E-edu-byte/inclusive-edu-navi/actions/workflows/update-editor-message.yml', '_blank');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  更新
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              「更新」をクリックするとメッセージがコピーされ、GitHub Actionsページが開きます。<br />
              「Run workflow」→ メッセージ欄に貼り付け → 「Run workflow」で実行してください。
            </p>
          </div>
        </section>

        {/* 記事の削除 */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            記事の削除
            {selectedArticleUrls.size > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">
                {selectedArticleUrls.size}件選択中
              </span>
            )}
          </h2>

          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            {/* 全選択/全解除 & 削除ボタン */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {selectedArticleUrls.size === allArticles.length ? '全解除' : '全選択'}
              </button>
              <span className="text-xs text-gray-500">
                {allArticles.length}件の記事
              </span>
            </div>

            {/* 記事リスト（チェックボックス付き） */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {allArticles.map((article, index) => (
                <label
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedArticleUrls.has(article.url)
                      ? 'bg-red-900/30 border border-red-700'
                      : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedArticleUrls.has(article.url)}
                    onChange={() => toggleArticleSelection(article.url)}
                    className="mt-1 w-4 h-4 rounded border-gray-500 text-red-600 focus:ring-red-500 bg-gray-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {article.isManual && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded">手動</span>
                      )}
                      <span className="text-xs text-gray-500">{article.date}</span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-gray-500 truncate">{article.source}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-1 line-clamp-2">
                      {article.title}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* 選択中のURL一覧（折りたたみ可能） */}
            {selectedArticleUrls.size > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                  選択中のURL一覧を表示
                </summary>
                <div className="mt-2 p-3 bg-gray-800 rounded-lg max-h-32 overflow-y-auto">
                  {Array.from(selectedArticleUrls).map((url, i) => (
                    <p key={i} className="text-xs text-gray-400 break-all mb-1">{url}</p>
                  ))}
                </div>
              </details>
            )}

            {/* 削除ボタン */}
            <button
              onClick={() => deleteArticles(Array.from(selectedArticleUrls))}
              disabled={selectedArticleUrls.size === 0}
              className={`mt-4 w-full px-4 py-3 font-medium rounded-lg transition-colors ${
                selectedArticleUrls.size > 0
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedArticleUrls.size > 0
                ? `${selectedArticleUrls.size}件の記事を削除`
                : '記事を選択してください'}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            ※ 削除された記事は excluded-urls.json に記録され、自動更新でも再取得されません
          </p>
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
                    <th className="pb-2 pr-4">種別</th>
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
                      <td className="py-2 pr-4">
                        {entry.isManual ? (
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded">手動</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded">自動</span>
                        )}
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

        {/* アクセス解析（Google Analytics） */}
        <section className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.84 2.998c-.018-.087-.054-.168-.103-.24a.757.757 0 0 0-.098-.133.748.748 0 0 0-.131-.1.738.738 0 0 0-.239-.104.741.741 0 0 0-.26-.023H1.992a.75.75 0 0 0-.53.22.75.75 0 0 0-.22.53v17.704a.75.75 0 0 0 .22.53.75.75 0 0 0 .53.22h20.016a.75.75 0 0 0 .53-.22.75.75 0 0 0 .22-.53V3.148a.741.741 0 0 0-.023-.15zM12 19.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/>
              </svg>
              アクセス解析
            </h2>
            <a
              href="https://analytics.google.com/analytics/web/#/p524851962/reports/intelligenthome"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Google Analytics を開く
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {analytics ? (
            <>
              {/* 基本指標 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <span className="text-gray-400 text-xs block mb-1">ページビュー</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-medium text-lg">{analytics.pageViews.toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">累計</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-blue-400 font-medium">{(analytics.todayPageViews ?? 0).toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">今日</span>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <span className="text-gray-400 text-xs block mb-1">ユーザー数</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-medium text-lg">{analytics.users.toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">累計</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-blue-400 font-medium">{(analytics.todayUsers ?? 0).toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">今日</span>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <span className="text-gray-400 text-xs block mb-1">セッション</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-medium text-lg">{analytics.sessions.toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">累計</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-blue-400 font-medium">{(analytics.todaySessions ?? 0).toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">今日</span>
                  </div>
                </div>
              </div>

              {/* クリック数 */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">クリック数</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <span className="text-amber-400 text-xs block mb-1">Amazon</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{analytics.clicks.amazon}</span>
                      <span className="text-gray-500 text-xs">累計</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-amber-400 font-medium">{analytics.todayClicks?.amazon ?? 0}</span>
                      <span className="text-gray-500 text-xs">今日</span>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <span className="text-red-400 text-xs block mb-1">楽天</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{analytics.clicks.rakuten}</span>
                      <span className="text-gray-500 text-xs">累計</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-red-400 font-medium">{analytics.todayClicks?.rakuten ?? 0}</span>
                      <span className="text-gray-500 text-xs">今日</span>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <span className="text-purple-400 text-xs block mb-1">OFUSE</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{analytics.clicks.ofuse}</span>
                      <span className="text-gray-500 text-xs">累計</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-purple-400 font-medium">{analytics.todayClicks?.ofuse ?? 0}</span>
                      <span className="text-gray-500 text-xs">今日</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* シェア数 */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">シェア数</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <span className="text-white text-xs block mb-1">X（Twitter）</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{analytics.shares.x}</span>
                      <span className="text-gray-500 text-xs">累計</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-blue-400 font-medium">{analytics.todayShares?.x ?? 0}</span>
                      <span className="text-gray-500 text-xs">今日</span>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <span className="text-[#06C755] text-xs block mb-1">LINE</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium">{analytics.shares.line}</span>
                      <span className="text-gray-500 text-xs">累計</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-[#06C755] font-medium">{analytics.todayShares?.line ?? 0}</span>
                      <span className="text-gray-500 text-xs">今日</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 人気ページ */}
              {analytics.topPages && analytics.topPages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">人気ページ TOP5</h3>
                  <div className="bg-gray-700 rounded-lg p-3">
                    {analytics.topPages.slice(0, 5).map((page, index) => (
                      <div key={index} className="flex justify-between text-xs py-1 border-b border-gray-600 last:border-0">
                        <span className="text-gray-300 truncate max-w-[250px]">{page.path}</span>
                        <span className="text-gray-400">{page.views.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-gray-500 text-xs">
                集計期間: {analytics.period} • 最終更新: {analytics.lastUpdated ? formatDate(analytics.lastUpdated) : '-'}
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">アクセス解析データを準備中...</p>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Google Analytics で確認
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
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

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">
              {selectedArticleUrls.size}件の記事を削除
            </h3>

            <p className="text-gray-300 text-sm mb-4">
              以下のURLをコピーして、GitHub Actionsの入力欄に貼り付けてください。
            </p>

            {/* コピー用テキストエリア */}
            <div className="relative mb-4">
              <textarea
                readOnly
                value={deleteUrlText}
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs font-mono resize-none focus:outline-none focus:border-amber-500"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deleteUrlText);
                  alert('URLをコピーしました');
                }}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                コピー
              </button>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">手順</h4>
              <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                <li>上のテキストをコピー（クリックで全選択、またはコピーボタン）</li>
                <li>「GitHub Actionsを開く」をクリック</li>
                <li>「Run workflow」をクリック</li>
                <li>urls欄にペースト</li>
                <li>緑の「Run workflow」ボタンで実行</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                コピーしてGitHub Actionsを開く
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
