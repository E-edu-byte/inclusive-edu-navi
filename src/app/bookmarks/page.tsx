'use client';

import Link from 'next/link';
import { useBookmarks, BookmarkedArticle } from '@/contexts/BookmarkContext';
import { getCategoryByName } from '@/lib/types';
import { generateAmazonSearchUrl, generateRakutenSearchUrl } from '@/data/articles';
import { trackClick } from '@/hooks/useTracking';

// フォールバック画像
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop',
];

// 最終フォールバック: ローカルSVGプレースホルダー（絶対に失敗しない）
const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e2e8f0' width='400' height='300'/%3E%3Cg fill='%2394a3b8'%3E%3Cpath d='M200 100c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm0 65c-13.8 0-25-11.2-25-25s11.2-25 25-25 25 11.2 25 25-11.2 25-25 25z'/%3E%3Cpath d='M280 210H120c-5.5 0-10-4.5-10-10v-20c0-27.6 22.4-50 50-50h80c27.6 0 50 22.4 50 50v20c0 5.5-4.5 10-10 10z'/%3E%3C/g%3E%3C/svg%3E";

function getFallbackImage(title: string): string {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

function isValidImageUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/images/')) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
}

function BookmarkCard({ article }: { article: BookmarkedArticle }) {
  const { removeBookmark } = useBookmarks();
  const hasValidImage = isValidImageUrl(article.imageUrl);
  const fallbackImage = getFallbackImage(article.title);
  const categoryInfo = article.category ? getCategoryByName(article.category) : null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* サムネイル */}
        <div className="sm:flex-shrink-0 sm:w-32 md:w-36">
          <div className="h-44 sm:h-full sm:min-h-[160px] overflow-hidden rounded-t-xl sm:rounded-t-none sm:rounded-l-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hasValidImage ? article.imageUrl : fallbackImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // 既にプレースホルダーなら何もしない
                if (target.src.startsWith('data:')) return;
                // Unsplashフォールバックも失敗したら最終プレースホルダーへ
                if (target.src.includes('unsplash.com')) {
                  target.src = PLACEHOLDER_SVG;
                } else {
                  // 元画像が失敗 → Unsplashフォールバックを試す
                  target.src = fallbackImage;
                }
              }}
            />
          </div>
        </div>

        {/* テキストコンテンツ */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
          {/* タグ行 */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {categoryInfo && (
              <Link
                href={`/category/${categoryInfo.id}`}
                className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800 hover:opacity-80 transition-opacity"
              >
                {article.category}
              </Link>
            )}
            <span className="text-xs text-gray-500">
              {article.source && `${article.source} • `}{article.date}
            </span>
          </div>

          {/* タイトル */}
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2">
            {article.title}
          </h3>

          {/* 要約 */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-grow line-clamp-3">
            {article.summary}
          </p>

          {/* アクションボタン */}
          <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-3 gap-y-3">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-1.5 text-white text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              元記事を読む
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {/* しおり解除ボタン */}
            <button
              onClick={() => removeBookmark(article.url)}
              className="inline-flex items-center gap-1 px-3 py-2.5 sm:py-1.5 text-sm font-medium rounded-lg border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">解除</span>
            </button>
            {/* 書籍検索リンク */}
            <span className="text-xs text-gray-400 py-2 sm:py-0">
              関連書籍:
              <a
                href={generateAmazonSearchUrl(undefined, article.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('amazon')}
                className="ml-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Amazon
              </a>
              <span className="mx-1 text-gray-300">|</span>
              <a
                href={generateRakutenSearchUrl(undefined, article.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('rakuten')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                楽天
              </a>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BookmarksPage() {
  const { bookmarks, bookmarkCount, maxBookmarks } = useBookmarks();

  return (
    <div className="container-main py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">保存した記事</h1>
        </div>
        <p className="text-gray-600">
          お気に入りの記事を{maxBookmarks}件まで保存できます。
          <span className="ml-2 text-amber-600 font-medium">
            現在 {bookmarkCount}/{maxBookmarks} 件
          </span>
        </p>
      </div>

      {/* 記事一覧 */}
      {bookmarks.length > 0 ? (
        <div className="space-y-4">
          {bookmarks.map((article) => (
            <BookmarkCard key={article.url} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h2 className="text-lg font-medium text-gray-700 mb-2">保存した記事はありません</h2>
          <p className="text-gray-500 mb-6">
            お気に入りの記事を{maxBookmarks}件まで保存できます。<br />
            記事カードの「保存」ボタンから追加してください。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            記事を探す
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* 補足説明 */}
      {bookmarks.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-3">
          <span className="text-lg" role="img" aria-label="情報">ℹ️</span>
          <p className="text-sm text-gray-600">
            ブラウザのデータを消去すると、保存した記事も削除されますのでご注意ください。
          </p>
        </div>
      )}
    </div>
  );
}
