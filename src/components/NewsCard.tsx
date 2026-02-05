'use client';

type NewsCardProps = {
  title: string;
  summary: string;
  imageUrl?: string;
  category: string;
  source?: string;
  date: string;
  url: string;
  // 編集部ピックアップ用
  isPickup?: boolean;
  pickupReason?: string;
};

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

  return (
    <article className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow ${cardBgClass}`}>
      {/* モバイル: 縦並び / PC: 横並び */}
      <div className="flex flex-col sm:flex-row">
        {/* サムネイル画像エリア - 幅を統一 */}
        <div className="sm:flex-shrink-0 sm:w-32 md:w-36">
          <div className="h-44 sm:h-full sm:min-h-[160px] overflow-hidden rounded-t-xl sm:rounded-t-none sm:rounded-l-xl">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 画像読み込みエラー時はプレースホルダーに切り替え
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.classList.add('bg-gradient-to-br', 'from-primary-100', 'to-primary-200');
                  target.parentElement!.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                      <svg class="w-12 h-12 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  `;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                <svg className="w-12 h-12 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
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
            {/* カテゴリタグ */}
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${categoryClass}`}>
              {category}
            </span>
            {/* ソースと日付 */}
            <span className="text-xs text-gray-500">
              {source && `${source} • `}{date}
            </span>
          </div>

          {/* タイトル */}
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2">
            {title}
          </h3>

          {/* 要約 */}
          <p className="text-sm text-gray-600 leading-relaxed mb-3 flex-grow line-clamp-3">
            {summary}
          </p>

          {/* 元記事を読むボタン */}
          <div className="mt-auto pt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${buttonClass}`}
            >
              元記事を読む
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
