'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getCategoryByName } from '@/lib/types';
import { generateAmazonSearchUrl, generateRakutenSearchUrl } from '@/data/articles';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { trackClick, trackShare } from '@/hooks/useTracking';
import BookmarkShortcut from '@/components/BookmarkShortcut';

type Article = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  url: string;
  imageUrl?: string;
  source?: string;
  mainKeyword?: string;
};

// フォールバック画像
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop',
];

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

// シェアURL生成（個別記事ページ）
const SITE_URL = 'https://news-navi.jp/inclusive';

function generateXShareUrl(title: string, articleId: string): string {
  const articleUrl = `${SITE_URL}/news/${articleId}/`;
  const shareText = `${title}\n#インクルーシブ教育 #福祉 #NewsNavi`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`;
}

function generateLineShareUrl(title: string, articleId: string): string {
  const articleUrl = `${SITE_URL}/news/${articleId}/`;
  const shareText = `${title}\n${articleUrl}`;
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(shareText)}`;
}

export default function NewsArticleClient({ article }: { article: Article }) {
  const { addBookmark, removeBookmark, isBookmarked, maxBookmarks } = useBookmarks();
  const [showToast, setShowToast] = useState(false);
  const bookmarked = isBookmarked(article.url);

  const handleBookmark = () => {
    if (bookmarked) {
      removeBookmark(article.url);
    } else {
      const success = addBookmark({
        id: article.url,
        title: article.title,
        summary: article.summary,
        date: article.date,
        source: article.source || '',
        url: article.url,
        category: article.category,
        imageUrl: article.imageUrl,
        articleId: article.id, // シェアURL用の記事ID
      });
      if (!success) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }
  };

  const hasValidImage = isValidImageUrl(article.imageUrl);
  const fallbackImage = getFallbackImage(article.title);
  const categoryInfo = getCategoryByName(article.category);

  return (
    <div className="container-main py-8">
      {/* スマホ用：保存した記事へのショートカット */}
      <BookmarkShortcut />

      <div className="max-w-2xl mx-auto">
        {/* 記事カード */}
        <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* サムネイル画像 */}
          <div className="aspect-video overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hasValidImage ? article.imageUrl : fallbackImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.startsWith('data:')) return;
                if (target.src.includes('unsplash.com')) {
                  target.src = PLACEHOLDER_SVG;
                } else {
                  target.src = fallbackImage;
                }
              }}
            />
          </div>

          {/* コンテンツ */}
          <div className="p-6">
            {/* カテゴリ・メタ情報 */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {categoryInfo && (
                <Link
                  href={`/category/${categoryInfo.id}`}
                  className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800 hover:opacity-80 transition-opacity"
                >
                  {article.category}
                </Link>
              )}
              <span className="text-sm text-gray-500">
                {article.source && `${article.source} • `}{article.date}
              </span>
            </div>

            {/* タイトル */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-snug">
              {article.title}
            </h1>

            {/* 要約 */}
            <p className="text-base text-gray-700 leading-relaxed mb-6">
              {article.summary}
            </p>

            {/* アクションボタン */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              {/* 元記事を読む */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 text-white text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 transition-colors whitespace-nowrap"
              >
                元記事を読む
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <span className="text-xs text-gray-400 hidden sm:inline">シェア:</span>
              {/* Xシェアボタン */}
              <a
                href={generateXShareUrl(article.title, article.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare('x')}
                className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-black hover:bg-gray-800 text-white transition-colors"
                title="Xでシェア"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LINEシェアボタン */}
              <a
                href={generateLineShareUrl(article.title, article.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare('line')}
                className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white transition-colors"
                title="LINEでシェア"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </a>
              {/* しおりボタン */}
              <button
                onClick={handleBookmark}
                className={`inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg border transition-colors ${
                  bookmarked
                    ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title={bookmarked ? 'しおりを解除' : 'しおりに追加'}
              >
                <svg
                  className={`w-5 h-5 sm:w-4 sm:h-4 ${bookmarked ? 'fill-amber-500' : 'fill-none stroke-current'}`}
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            </div>

            {/* 関連書籍リンク */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
              <span>📖 この記事の関連書籍</span>
              <span className="mx-1.5">⇒</span>
              <a
                href={generateAmazonSearchUrl(article.mainKeyword, article.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('amazon')}
                className="font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                Amazon
              </a>
              <span className="mx-1.5 text-gray-300">/</span>
              <a
                href={generateRakutenSearchUrl(article.mainKeyword, article.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('rakuten')}
                className="font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                楽天
              </a>
            </div>
          </div>
        </article>

        {/* トップページに戻るボタン */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            記事一覧に戻る
          </Link>
        </div>

        {/* トースト通知 */}
        {showToast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg max-w-sm text-center animate-fade-in">
            保存できるのは最大{maxBookmarks}件までです。
          </div>
        )}
      </div>
    </div>
  );
}
