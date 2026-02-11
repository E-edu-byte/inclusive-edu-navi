'use client';

import Link from 'next/link';
import { useBookmarks } from '@/contexts/BookmarkContext';

export default function BookmarkShortcut() {
  const { bookmarkCount, maxBookmarks } = useBookmarks();

  return (
    <div className="lg:hidden mb-6">
      <Link
        href="/bookmarks"
        className="flex items-center justify-between w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-amber-800">保存した記事をみる</span>
            <span className="ml-2 text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
              {bookmarkCount}/{maxBookmarks}
            </span>
          </div>
        </div>
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
