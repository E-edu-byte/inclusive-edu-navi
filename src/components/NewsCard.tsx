'use client';

import Link from 'next/link';
import { getCategoryByName } from '@/lib/types';
import { generateAmazonSearchUrl } from '@/data/articles';

type NewsCardProps = {
  title: string;
  summary: string;
  imageUrl?: string;
  category: string;
  source?: string;
  date: string;
  url: string;
  // Amazon検索用キーワード（AI抽出）
  mainKeyword?: string;
  // 編集部ピックアップ用
  isPickup?: boolean;
  pickupReason?: string;
};

// インクルーシブ教育をイメージしたフォールバック画像（Unsplash）
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop', // 子どもたちの学び
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop', // 教室
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop', // 多様な学び
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop', // 支援
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop', // 教育
];

// 記事タイトルからハッシュを生成してフォールバック画像を選択
function getFallbackImage(title: string): string {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

// 画像URLが有効かチェック（ローカルの存在しない画像パスは無効とみなす）
function isValidImageUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/images/')) return false; // ローカル画像は存在しないので無効
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
}

export default function NewsCard({
  title,
  summary,
  imageUrl,
  category,
  source,
  date,
  url,
  mainKeyword,
  isPickup = false,
  pickupReason,
}: NewsCardProps) {
  // カードの背景色
  const cardBgClass = isPickup
    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
    : 'bg-white border-gray-200';

  // ボタンの色
  const buttonClass = isPickup
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-primary-600 hover:bg-primary-700';

  // カテゴリバッジの色
  const categoryClass = isPickup
    ? 'bg-amber-100 text-amber-800'
    : 'bg-primary-100 text-primary-800';

  // ピックアップ理由タグの色
  const pickupReasonClass = 'bg-amber-200 text-amber-900';

  const hasValidImage = isValidImageUrl(imageUrl);
  const fallbackImage = getFallbackImage(title);

  return (
    <article className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow ${cardBgClass}`}>
      {/* モバイル: 縦並び / PC: 横並び */}
      <div className="flex flex-col sm:flex-row">
        {/* サムネイル画像エリア - 幅を統一 */}
        <div className="sm:flex-shrink-0 sm:w-32 md:w-36">
          <div className="h-44 sm:h-full sm:min-h-[160px] overflow-hidden rounded-t-xl sm:rounded-t-none sm:rounded-l-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hasValidImage ? imageUrl : fallbackImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                // 画像読み込みエラー時はフォールバック画像に切り替え
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('unsplash.com')) {
                  target.src = fallbackImage;
                }
              }}
            />
          </div>
        </div>

        {/* テキストコンテンツエリア */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
          {/* タグ行: ピックアップ理由 + カテゴリ + メタ情報を横並び */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* ピックアップ理由タグ（編集部ピックアップの場合） */}
            {isPickup && pickupReason && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${pickupReasonClass}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {pickupReason}
              </span>
            )}
            {/* カテゴリタグ（クリックでカテゴリページへ） */}
            {(() => {
              const cat = getCategoryByName(category);
              const categoryId = cat?.id || 'topics';
              return (
                <Link
                  href={`/category/${categoryId}`}
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full hover:opacity-80 transition-opacity ${categoryClass}`}
                >
                  {category}
                </Link>
              );
            })()}
            {/* ソースと日付 */}
            <span className="text-xs text-gray-500">
              {source && `${source} • `}{date}
            </span>
          </div>

          {/* タイトル */}
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2">
            {title}
          </h3>

          {/* 要約 - スマホでも読みやすく */}
          <p className="text-sm sm:text-sm text-gray-600 leading-relaxed sm:leading-relaxed mb-4 flex-grow">
            {summary}
          </p>

          {/* 元記事を読むボタン + Amazon検索リンク - タップしやすい間隔 */}
          <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${buttonClass}`}
            >
              元記事を読む
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {/* Amazon検索リンク（mainKeywordを優先、なければタイトルから抽出） */}
            <a
              href={generateAmazonSearchUrl(mainKeyword, title)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-xs text-gray-500 hover:text-gray-700 transition-colors py-2 sm:py-0"
            >
              📖 このテーマの参考書籍（Amazon）
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
