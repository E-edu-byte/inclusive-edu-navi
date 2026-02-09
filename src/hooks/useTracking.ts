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
};

const STORAGE_KEY = 'news-navi-tracking';

// 初期データ
const initialTracking: TrackingData = {
  pageViews: {},
  clicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  shares: { x: 0, line: 0 },
  errors: [],
  lastReset: new Date().toISOString(),
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

// ページビューを記録
export function trackPageView(path: string): void {
  const tracking = getTracking();
  tracking.pageViews[path] = (tracking.pageViews[path] || 0) + 1;
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
