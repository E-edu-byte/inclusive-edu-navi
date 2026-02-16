'use client';

import Link from 'next/link';
import { useBookmarks, BookmarkedArticle } from '@/contexts/BookmarkContext';
import { getCategoryByName } from '@/lib/types';
import { generateAmazonSearchUrl, generateRakutenSearchUrl } from '@/data/articles';
import { trackClick, trackShare } from '@/hooks/useTracking';

// サイトURL（シェア用）
const SITE_URL = 'https://news-navi.jp/inclusive';

// X（Twitter）シェアURL生成（記事IDがあれば個別記事ページ、なければトップページ）
function generateXShareUrl(title: string, articleId?: string): string {
  const shareUrl = articleId ? `${SITE_URL}/news/${articleId}/` : `${SITE_URL}/`;
  const shareText = `${title}\n#インクルーシブ教育 #福祉 #NewsNavi`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
}

// LINEシェアURL生成（記事IDがあれば個別記事ページ、なければトップページ）
function generateLineShareUrl(title: string, articleId?: string): string {
  const shareUrl = articleId ? `${SITE_URL}/news/${articleId}/` : `${SITE_URL}/`;
  const shareText = `${title}\n${shareUrl}`;
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
}

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

type BookmarkCardProps = {
  article: BookmarkedArticle;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
};

function BookmarkCard({ article, index, totalCount, onMoveUp, onMoveDown }: BookmarkCardProps) {
  const { removeBookmark } = useBookmarks();
  const hasValidImage = isValidImageUrl(article.imageUrl);
  const fallbackImage = getFallbackImage(article.title);
  const categoryInfo = article.category ? getCategoryByName(article.category) : null;

  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <article className="rounded-xl border bg-white shadow-sm border-gray-200 hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row">
        {/* サムネイル（矢印ボタン付き） */}
        <div className="sm:flex-shrink-0 sm:w-32 md:w-36 relative">
          <div className="h-44 sm:h-full sm:min-h-[160px] overflow-hidden rounded-t-xl sm:rounded-t-none sm:rounded-l-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hasValidImage ? article.imageUrl : fallbackImage}
              alt=""
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{ WebkitTouchCallout: 'none' }}
              draggable={false}
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
          {/* 並べ替えボタン（複数記事がある場合のみ表示） */}
          {totalCount > 1 && (
            <>
              {/* 下に移動ボタン（左上） */}
              <button
                onClick={() => onMoveDown(index)}
                disabled={!canMoveDown}
                className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canMoveDown
                    ? 'bg-white/90 hover:bg-white text-gray-700 hover:text-primary-600 shadow-md'
                    : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
                }`}
                title="下に移動"
                aria-label="下に移動"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
              {/* 上に移動ボタン（右上） */}
              <button
                onClick={() => onMoveUp(index)}
                disabled={!canMoveUp}
                className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canMoveUp
                    ? 'bg-white/90 hover:bg-white text-gray-700 hover:text-primary-600 shadow-md'
                    : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
                }`}
                title="上に移動"
                aria-label="上に移動"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </>
          )}
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
          <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-grow">
            {article.summary}
          </p>

          {/* アクションボタン（トップページと同じ順序: 元記事→X→LINE→ゴミ箱） */}
          <div className="mt-auto pt-3 flex items-center gap-2">
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
            <span className="text-xs text-gray-400 hidden sm:inline">シェア:</span>
            {/* Xシェアボタン */}
            <a
              href={generateXShareUrl(article.title, article.articleId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackShare('x')}
              className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-black hover:bg-gray-800 text-white transition-colors"
              title="Xでシェア"
              aria-label="Xでシェア"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LINEシェアボタン */}
            <a
              href={generateLineShareUrl(article.title, article.articleId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackShare('line')}
              className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white transition-colors"
              title="LINEでシェア"
              aria-label="LINEでシェア"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </a>
            {/* しおり解除ボタン */}
            <button
              onClick={() => removeBookmark(article.url)}
              className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-colors"
              title="保存を解除"
              aria-label="保存を解除"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          {/* 書籍検索リンク */}
          <div className="mt-2 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            <span>📖 関連書籍</span>
            <span className="mx-1">⇒</span>
            <a
              href={generateAmazonSearchUrl(undefined, article.title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('amazon')}
              className="font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Amazon
            </a>
            <span className="mx-1 text-gray-300">/</span>
            <a
              href={generateRakutenSearchUrl(undefined, article.title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('rakuten')}
              className="font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              楽天
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BookmarksPage() {
  const { bookmarks, bookmarkCount, maxBookmarks, reorderBookmarks } = useBookmarks();

  // 上に移動（1つ上の記事と入れ替え）
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderBookmarks(index, index - 1);
    }
  };

  // 下に移動（1つ下の記事と入れ替え）
  const handleMoveDown = (index: number) => {
    if (index < bookmarks.length - 1) {
      reorderBookmarks(index, index + 1);
    }
  };

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
          {bookmarks.length > 1 && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              矢印ボタンで順番を変更できます
            </p>
          )}
          {bookmarks.map((article, index) => (
            <BookmarkCard
              key={article.url}
              article={article}
              index={index}
              totalCount={bookmarks.length}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
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
