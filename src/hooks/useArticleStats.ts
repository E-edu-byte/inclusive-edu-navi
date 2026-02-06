'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_VIEWS = 'article_views';
const STORAGE_KEY_BOOKMARKS = 'article_bookmarks';

type ArticleStats = {
  [articleId: string]: {
    views: number;
    bookmarked: boolean;
  };
};

export function useArticleStats() {
  const [stats, setStats] = useState<ArticleStats>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // LocalStorageから読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewsData = localStorage.getItem(STORAGE_KEY_VIEWS);
    const bookmarksData = localStorage.getItem(STORAGE_KEY_BOOKMARKS);

    const views: { [id: string]: number } = viewsData ? JSON.parse(viewsData) : {};
    const bookmarks: { [id: string]: boolean } = bookmarksData ? JSON.parse(bookmarksData) : {};

    const combined: ArticleStats = {};
    const allIds = new Set([...Object.keys(views), ...Object.keys(bookmarks)]);

    allIds.forEach((id) => {
      combined[id] = {
        views: views[id] || 0,
        bookmarked: bookmarks[id] || false,
      };
    });

    setStats(combined);
    setIsLoaded(true);
  }, []);

  // 閲覧数をインクリメント
  const incrementView = useCallback((articleId: string) => {
    if (typeof window === 'undefined') return;

    const viewsData = localStorage.getItem(STORAGE_KEY_VIEWS);
    const views: { [id: string]: number } = viewsData ? JSON.parse(viewsData) : {};

    views[articleId] = (views[articleId] || 0) + 1;
    localStorage.setItem(STORAGE_KEY_VIEWS, JSON.stringify(views));

    setStats((prev) => ({
      ...prev,
      [articleId]: {
        views: views[articleId],
        bookmarked: prev[articleId]?.bookmarked || false,
      },
    }));
  }, []);

  // しおりをトグル
  const toggleBookmark = useCallback((articleId: string) => {
    if (typeof window === 'undefined') return;

    const bookmarksData = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    const bookmarks: { [id: string]: boolean } = bookmarksData ? JSON.parse(bookmarksData) : {};

    bookmarks[articleId] = !bookmarks[articleId];
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));

    setStats((prev) => ({
      ...prev,
      [articleId]: {
        views: prev[articleId]?.views || 0,
        bookmarked: bookmarks[articleId],
      },
    }));
  }, []);

  // 全体の閲覧数を取得
  const getViewCount = useCallback(
    (articleId: string): number => {
      return stats[articleId]?.views || 0;
    },
    [stats]
  );

  // しおり状態を取得
  const isBookmarked = useCallback(
    (articleId: string): boolean => {
      return stats[articleId]?.bookmarked || false;
    },
    [stats]
  );

  // 全しおり数を集計
  const getTotalBookmarks = useCallback((): { [id: string]: number } => {
    const counts: { [id: string]: number } = {};
    Object.entries(stats).forEach(([id, data]) => {
      counts[id] = data.bookmarked ? 1 : 0;
    });
    return counts;
  }, [stats]);

  return {
    isLoaded,
    stats,
    incrementView,
    toggleBookmark,
    getViewCount,
    isBookmarked,
    getTotalBookmarks,
  };
}

// グローバルな閲覧数・しおり数を取得するユーティリティ
export function getGlobalStats(): { views: { [id: string]: number }; bookmarks: { [id: string]: number } } {
  if (typeof window === 'undefined') {
    return { views: {}, bookmarks: {} };
  }

  const viewsData = localStorage.getItem(STORAGE_KEY_VIEWS);
  const bookmarksData = localStorage.getItem(STORAGE_KEY_BOOKMARKS);

  const views: { [id: string]: number } = viewsData ? JSON.parse(viewsData) : {};
  const bookmarkFlags: { [id: string]: boolean } = bookmarksData ? JSON.parse(bookmarksData) : {};

  const bookmarks: { [id: string]: number } = {};
  Object.entries(bookmarkFlags).forEach(([id, isBookmarked]) => {
    bookmarks[id] = isBookmarked ? 1 : 0;
  });

  return { views, bookmarks };
}
