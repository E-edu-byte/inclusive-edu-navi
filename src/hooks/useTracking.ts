'use client';

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
};

const STORAGE_KEY = 'news-navi-tracking';

// 初期データ
const initialTracking: TrackingData = {
  pageViews: {},
  clicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  shares: { x: 0, line: 0 },
  errors: [],
  lastReset: new Date().toISOString(),
  totalPageViews: 0,
  dailyPageViews: {},
};

// トラッキングデータを取得
function getTracking(): TrackingData {
  if (typeof window === 'undefined') return initialTracking;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialTracking;
  } catch {
    return initialTracking;
  }
}

// トラッキングデータを保存
function saveTracking(data: TrackingData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('トラッキング保存エラー:', error);
  }
}

// 今日の日付を取得（YYYY-MM-DD形式）
function getTodayDate(): string {
  return new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }).replace(/\//g, '-');
}

// ページビューを記録
export function trackPageView(path: string): void {
  const tracking = getTracking();
  tracking.pageViews[path] = (tracking.pageViews[path] || 0) + 1;

  // 日別アクセス記録を更新
  const today = getTodayDate();
  if (!tracking.dailyPageViews) {
    tracking.dailyPageViews = {};
  }
  tracking.dailyPageViews[today] = (tracking.dailyPageViews[today] || 0) + 1;

  // 累計アクセス数を更新
  if (!tracking.totalPageViews) {
    tracking.totalPageViews = 0;
  }
  tracking.totalPageViews += 1;

  // 古い日別記録を削除（7日以上前）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }).replace(/\//g, '-');
  for (const date of Object.keys(tracking.dailyPageViews)) {
    if (date < cutoffDate) {
      delete tracking.dailyPageViews[date];
    }
  }

  saveTracking(tracking);
}

// クリックを記録
export function trackClick(type: 'amazon' | 'rakuten' | 'buymeacoffee'): void {
  const tracking = getTracking();
  tracking.clicks[type] = (tracking.clicks[type] || 0) + 1;
  saveTracking(tracking);
}

// シェアを記録
export function trackShare(type: 'x' | 'line'): void {
  const tracking = getTracking();
  if (!tracking.shares) {
    tracking.shares = { x: 0, line: 0 };
  }
  tracking.shares[type] = (tracking.shares[type] || 0) + 1;
  saveTracking(tracking);
}

// エラーを記録
export function trackError(path: string, type: string): void {
  const tracking = getTracking();
  tracking.errors.push({
    timestamp: new Date().toISOString(),
    path,
    type,
  });
  // 最大100件まで保持
  if (tracking.errors.length > 100) {
    tracking.errors = tracking.errors.slice(-100);
  }
  saveTracking(tracking);
}

// エクスポート
export { getTracking, saveTracking };
