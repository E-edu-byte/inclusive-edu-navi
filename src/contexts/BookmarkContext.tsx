'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 保存する記事データの型
export type BookmarkedArticle = {
  id: string;
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  category?: string;
  imageUrl?: string;
  savedAt: string; // 保存日時
  articleId?: string; // 記事ID（シェアURL用）
};

type BookmarkContextType = {
  bookmarks: BookmarkedArticle[];
  addBookmark: (article: Omit<BookmarkedArticle, 'savedAt'>) => boolean;
  removeBookmark: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  reorderBookmarks: (fromIndex: number, toIndex: number) => void;
  bookmarkCount: number;
  maxBookmarks: number;
};

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const STORAGE_KEY = 'inclusive-edu-navi-bookmarks';
const MAX_BOOKMARKS = 10;

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // localStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBookmarks(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
    setIsLoaded(true);
  }, []);

  // localStorageに保存
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
      } catch (error) {
        console.error('Failed to save bookmarks:', error);
      }
    }
  }, [bookmarks, isLoaded]);

  const addBookmark = (article: Omit<BookmarkedArticle, 'savedAt'>): boolean => {
    // 既に保存済みの場合
    if (bookmarks.some(b => b.url === article.url)) {
      return true;
    }

    // 最大件数チェック
    if (bookmarks.length >= MAX_BOOKMARKS) {
      return false;
    }

    const newBookmark: BookmarkedArticle = {
      ...article,
      savedAt: new Date().toISOString(),
    };

    setBookmarks(prev => [newBookmark, ...prev]);
    return true;
  };

  const removeBookmark = (url: string) => {
    setBookmarks(prev => prev.filter(b => b.url !== url));
  };

  const isBookmarked = (url: string): boolean => {
    return bookmarks.some(b => b.url === url);
  };

  const reorderBookmarks = (fromIndex: number, toIndex: number) => {
    setBookmarks(prev => {
      const newBookmarks = [...prev];
      const [removed] = newBookmarks.splice(fromIndex, 1);
      newBookmarks.splice(toIndex, 0, removed);
      return newBookmarks;
    });
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,
        reorderBookmarks,
        bookmarkCount: bookmarks.length,
        maxBookmarks: MAX_BOOKMARKS,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}
