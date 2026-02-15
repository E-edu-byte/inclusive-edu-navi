'use client';

// クリック/シェアの詳細型
type ClickType = 'amazon' | 'rakuten' | 'buymeacoffee';
type ShareType = 'x' | 'line';

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
  // 累計クリック数（リセットしても保持）
  totalClicks?: {
    amazon: number;
    rakuten: number;
    buymeacoffee: number;
  };
  // 日別クリック記録
  dailyClicks?: { [date: string]: { amazon: number; rakuten: number; buymeacoffee: number } };
  // 累計シェア数（リセットしても保持）
  totalShares?: {
    x: number;
    line: number;
  };
  // 日別シェア記録
  dailyShares?: { [date: string]: { x: number; line: number } };
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
  totalClicks: { amazon: 0, rakuten: 0, buymeacoffee: 0 },
  dailyClicks: {},
  totalShares: { x: 0, line: 0 },
  dailyShares: {},
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

// 今日の日付を取得（YYYY-MM-DD形式、ゼロパディング付き）
function getTodayDate(): string {
  const now = new Date();
  // JSTに変換
  const jstOffset = 9 * 60; // 9時間（分）
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (jstOffset * 60000));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, '0');
  const day = String(jst.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const jstOffset = 9 * 60;
  const utc = sevenDaysAgo.getTime() + (sevenDaysAgo.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (jstOffset * 60000));
  const cutoffDate = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
  for (const date of Object.keys(tracking.dailyPageViews)) {
    if (date < cutoffDate) {
      delete tracking.dailyPageViews[date];
    }
  }

  saveTracking(tracking);
}

// クリックを記録（GA4にも送信）
export function trackClick(type: ClickType): void {
  // GA4にイベント送信
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'affiliate_click', {
      event_category: 'engagement',
      event_label: type,
      affiliate_type: type,
    });
  }

  const tracking = getTracking();
  const today = getTodayDate();

  // 通常のクリック数を更新
  tracking.clicks[type] = (tracking.clicks[type] || 0) + 1;

  // 累計クリック数を更新
  if (!tracking.totalClicks) {
    tracking.totalClicks = { amazon: 0, rakuten: 0, buymeacoffee: 0 };
  }
  tracking.totalClicks[type] = (tracking.totalClicks[type] || 0) + 1;

  // 日別クリック記録を更新
  if (!tracking.dailyClicks) {
    tracking.dailyClicks = {};
  }
  if (!tracking.dailyClicks[today]) {
    tracking.dailyClicks[today] = { amazon: 0, rakuten: 0, buymeacoffee: 0 };
  }
  tracking.dailyClicks[today][type] = (tracking.dailyClicks[today][type] || 0) + 1;

  // 古い日別記録を削除（7日以上前）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const jstOffset = 9 * 60;
  const utc = sevenDaysAgo.getTime() + (sevenDaysAgo.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (jstOffset * 60000));
  const cutoffDate = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
  for (const date of Object.keys(tracking.dailyClicks)) {
    if (date < cutoffDate) {
      delete tracking.dailyClicks[date];
    }
  }

  saveTracking(tracking);
}

// シェアを記録（GA4にも送信）
export function trackShare(type: ShareType): void {
  // GA4にイベント送信
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'share', {
      event_category: 'engagement',
      event_label: type,
      method: type === 'x' ? 'Twitter' : 'LINE',
    });
  }

  const tracking = getTracking();
  const today = getTodayDate();

  // 通常のシェア数を更新
  if (!tracking.shares) {
    tracking.shares = { x: 0, line: 0 };
  }
  tracking.shares[type] = (tracking.shares[type] || 0) + 1;

  // 累計シェア数を更新
  if (!tracking.totalShares) {
    tracking.totalShares = { x: 0, line: 0 };
  }
  tracking.totalShares[type] = (tracking.totalShares[type] || 0) + 1;

  // 日別シェア記録を更新
  if (!tracking.dailyShares) {
    tracking.dailyShares = {};
  }
  if (!tracking.dailyShares[today]) {
    tracking.dailyShares[today] = { x: 0, line: 0 };
  }
  tracking.dailyShares[today][type] = (tracking.dailyShares[today][type] || 0) + 1;

  // 古い日別記録を削除（7日以上前）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const jstOffset = 9 * 60;
  const utc = sevenDaysAgo.getTime() + (sevenDaysAgo.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (jstOffset * 60000));
  const cutoffDate = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
  for (const date of Object.keys(tracking.dailyShares)) {
    if (date < cutoffDate) {
      delete tracking.dailyShares[date];
    }
  }

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
